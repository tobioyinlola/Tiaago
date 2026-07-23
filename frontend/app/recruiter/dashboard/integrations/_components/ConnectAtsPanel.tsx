"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { CheckCircle2, Link2, Loader2, Plug, RefreshCw, Search, XCircle } from "lucide-react";

import { cn } from "@/app/common/utils";
import Button from "@/app/common/components/DaisyButton";
import { useAlert } from "@/app/common/store/useAlert";
import { AvailableAtsIntegration } from "@/app/common/services/ats-server";
import {
  AtsConnection,
  AtsProvider,
  createAtsConnectSession,
  getAtsConnection,
  listAtsConnections,
  triggerAtsSync,
} from "@/app/common/services/ats";

const statusBadge: Record<AtsConnection["status"], string> = {
  PENDING: "bg-[#F5F6F7] text-secondary-black",
  CONNECTED: "bg-badge-blue-bg text-badge-blue-text",
  SYNCING: "bg-badge-blue-bg text-badge-blue-text",
  SYNCED: "bg-badge-green-bg text-badge-green-text",
  FAILED: "bg-destructive/10 text-destructive",
};

const statusLabel: Record<AtsConnection["status"], string> = {
  PENDING: "Pending",
  CONNECTED: "Connected",
  SYNCING: "Syncing",
  SYNCED: "Synced",
  FAILED: "Failed",
};

const ProviderLogo = ({ logo, name, className }: { logo: string | null; name: string; className?: string }) =>
  logo ? (
    // eslint-disable-next-line @next/next/no-img-element -- Nango-hosted logo, not on our own image domains
    <img src={logo} alt={name} className={cn("object-contain", className)} />
  ) : (
    <Link2 className={cn("text-secondary-black", className)} />
  );

/** Connect -> pull -> disconnect UI for one ATS. Nango's frontend SDK
 * touches the DOM/window, so it's imported dynamically inside the click
 * handler rather than at module scope -- this file still SSRs fine. */
const ConnectAtsPanel = ({ integrations }: { integrations: AvailableAtsIntegration[] }) => {
  const setAlert = useAlert(s => s.setAlert);
  const [busyProvider, setBusyProvider] = useState<AtsProvider | null>(null);
  const [active, setActive] = useState<AtsConnection | null>(null);
  const [history, setHistory] = useState<AtsConnection[]>([]);
  const [search, setSearch] = useState("");
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const integrationByProvider = (provider: AtsProvider) => integrations.find(i => i.provider === provider);
  const displayName = (provider: AtsProvider) => integrationByProvider(provider)?.display_name ?? provider;

  const visibleIntegrations = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return integrations;
    return integrations.filter(i => i.display_name.toLowerCase().includes(query));
  }, [integrations, search]);

  const refreshHistory = async () => {
    const res = await listAtsConnections();
    if (res.success) setHistory(res.data.results);
  };

  useEffect(() => {
    refreshHistory();
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const pollUntilDone = (connectionId: AtsConnection["id"]) => {
    if (pollRef.current) clearInterval(pollRef.current);
    pollRef.current = setInterval(async () => {
      const res = await getAtsConnection(connectionId);
      if (!res.success) return;
      setActive(res.data);
      if (res.data.status === "SYNCED" || res.data.status === "FAILED") {
        if (pollRef.current) clearInterval(pollRef.current);
        setBusyProvider(null);
        refreshHistory();
      }
    }, 2000);
  };

  const handleConnect = async (provider: AtsProvider) => {
    setBusyProvider(provider);
    setActive(null);

    const sessionRes = await createAtsConnectSession(provider);
    if (!sessionRes.success) {
      setAlert({ title: "Error", message: sessionRes.error, icon: "error" });
      setBusyProvider(null);
      return;
    }
    const { connection_id, session_token } = sessionRes.data;

    const { default: Nango } = await import("@nangohq/frontend");
    const nango = new Nango();

    nango.openConnectUI({
      sessionToken: session_token,
      onEvent: async event => {
        if (event.type === "connect") {
          const { connectionId: nangoConnectionId, providerConfigKey } = event.payload as {
            connectionId: string;
            providerConfigKey: string;
          };
          const syncRes = await triggerAtsSync(connection_id, {
            nango_connection_id: nangoConnectionId,
            provider_config_key: providerConfigKey,
          });
          if (!syncRes.success) {
            setAlert({ title: "Error", message: syncRes.error, icon: "error" });
            setBusyProvider(null);
            return;
          }
          setActive(syncRes.data);
          pollUntilDone(connection_id);
        } else if (event.type === "close") {
          // Modal closed without completing auth -- only clear the busy
          // state if we never got a 'connect' event for it.
          setBusyProvider(current => (active ? current : null));
        }
      },
    });
  };

  const handleRetry = async (connectionId: AtsConnection["id"], provider: AtsProvider) => {
    setBusyProvider(provider);
    const res = await triggerAtsSync(connectionId);
    if (!res.success) {
      setAlert({ title: "Error", message: res.error, icon: "error" });
      setBusyProvider(null);
      return;
    }
    setActive(res.data);
    pollUntilDone(connectionId);
  };

  return (
    <div className="flex flex-col gap-8">
      <div className="bg-white rounded-2lg border border-[#EAECF0] p-6">
        <h2 className="text-lg font-semibold text-primaryBlack mb-1">Connect your ATS</h2>
        <p className="text-secondary-black text-sm mb-6">
          Pick the system you use. We&apos;ll pull your candidates and open jobs once, save them here, then
          disconnect automatically -- nothing stays connected in the background.
        </p>

        {integrations.length === 0 ? (
          <div className="rounded-lg border border-dashed border-[#EAECF0] py-10 text-center mb-6">
            <p className="text-sm font-medium text-primaryBlack">No ATS integrations configured yet</p>
            <p className="text-sm text-secondary-black mt-1">
              Set one up in your Nango dashboard (Integrations -&gt; Configure New Integration) and it will
              appear here automatically.
            </p>
          </div>
        ) : (
          <>
            <div className="relative mb-4">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-secondary-black" />
              <input
                type="text"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search ATS platforms..."
                className="input input-bordered w-full pl-9 rounded-lg border-[#EAECF0] focus:border-primary focus:outline-none"
              />
            </div>

            {visibleIntegrations.length === 0 ? (
              <p className="text-sm text-secondary-black text-center py-8 mb-2">
                No ATS platforms match &quot;{search}&quot;.
              </p>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-6">
                {visibleIntegrations.map(integration => {
                  const isBusy = busyProvider === integration.provider;
                  return (
                    <button
                      key={integration.provider}
                      type="button"
                      disabled={!!busyProvider}
                      onClick={() => handleConnect(integration.provider)}
                      className={cn(
                        "flex flex-col items-center gap-3 rounded-xl border-2 p-5 text-center transition-all",
                        isBusy ? "border-primary" : "border-[#EAECF0] hover:border-primary/40",
                        !!busyProvider && !isBusy && "opacity-50 cursor-not-allowed"
                      )}
                    >
                      <div className="w-14 h-14 rounded-xl bg-[#F5F6F7] flex items-center justify-center overflow-hidden shrink-0">
                        <ProviderLogo logo={integration.logo} name={integration.display_name} className="w-8 h-8" />
                      </div>
                      <span className="text-sm font-medium text-primaryBlack">{integration.display_name}</span>
                      <span className="text-xs font-medium text-primary flex items-center gap-1.5">
                        {isBusy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plug className="w-3.5 h-3.5" />}
                        {isBusy ? "Connecting..." : "Connect"}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
          </>
        )}

        {active && (
          <div className="rounded-lg border border-[#EAECF0] p-4">
            <div className="flex items-center justify-between gap-3 mb-1">
              <span className="flex items-center gap-2 text-sm font-medium text-primaryBlack">
                <ProviderLogo
                  logo={integrationByProvider(active.provider)?.logo ?? null}
                  name={displayName(active.provider)}
                  className="w-4 h-4"
                />
                {displayName(active.provider)}
              </span>
              <span className={cn("text-xs font-medium px-2.5 py-1 rounded-full", statusBadge[active.status])}>
                {statusLabel[active.status]}
              </span>
            </div>

            {(active.status === "CONNECTED" || active.status === "SYNCING") && (
              <p className="text-sm text-secondary-black flex items-center gap-2 mt-2">
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                Pulling candidates and open jobs -- this can take a minute for large accounts.
              </p>
            )}

            {active.status === "SYNCED" && (
              <div className="mt-2">
                <p className="text-sm text-success flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Synced {active.candidates_synced} candidate{active.candidates_synced === 1 ? "" : "s"} and{" "}
                  {active.jobs_synced} job{active.jobs_synced === 1 ? "" : "s"}. Connection disconnected.
                </p>
              </div>
            )}

            {active.status === "FAILED" && (
              <div className="mt-2 flex items-start justify-between gap-3">
                <p className="text-sm text-destructive flex items-start gap-2">
                  <XCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                  {active.error_message || "Sync failed."} The connection was kept so you can retry without
                  reconnecting.
                </p>
                <Button
                  type="button"
                  color="primary"
                  size="sm"
                  className="text-white gap-1.5 shrink-0"
                  onClick={() => handleRetry(active.id, active.provider)}
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  Retry
                </Button>
              </div>
            )}
          </div>
        )}
      </div>

      <div className="bg-white rounded-2lg border border-[#EAECF0] p-6">
        <h3 className="text-base font-semibold text-primaryBlack mb-4">Recent syncs</h3>
        {history.length === 0 ? (
          <p className="text-sm text-secondary-black">No syncs yet.</p>
        ) : (
          <div className="divide-y divide-[#EAECF0]">
            {history.map(h => (
              <div key={h.id} className="flex items-center justify-between py-3 text-sm">
                <div className="flex items-center gap-3">
                  <ProviderLogo
                    logo={integrationByProvider(h.provider)?.logo ?? null}
                    name={displayName(h.provider)}
                    className="w-4 h-4"
                  />
                  <span className="font-medium text-primaryBlack">{displayName(h.provider)}</span>
                  <span className={cn("text-xs font-medium px-2 py-[2px] rounded-full", statusBadge[h.status])}>
                    {statusLabel[h.status]}
                  </span>
                </div>
                <span className="text-secondary-black text-xs">
                  {h.status === "SYNCED"
                    ? `${h.candidates_synced} candidates, ${h.jobs_synced} jobs`
                    : new Date(h.created_at).toLocaleString()}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default ConnectAtsPanel;
