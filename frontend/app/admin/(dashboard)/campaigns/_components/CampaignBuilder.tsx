"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import AudiencePicker, { AudienceValue } from "@/app/common/components/dashboard/AudiencePicker";
import DateTimePicker from "@/app/common/components/dashboard/DateTimePicker";
import Modal from "@/app/common/components/Modal";
import SlideOver from "@/app/common/components/SlideOver";
import clientKyInstance from "@/app/common/utils/client-ky.instance";
import {
  CampaignEmailPayload,
  cancelCampaign,
  createCampaignEmail,
  deleteCampaignEmail,
  pauseCampaign,
  previewCampaignAudience,
  resumeCampaign,
  sendCampaign,
  sendTestCampaignEmail,
  updateCampaign,
  updateCampaignEmail,
} from "@/app/common/services/campaigns";
import {
  AudiencePreview,
  CampaignAudiencePool,
  CampaignEmail,
  CampaignScheduleType,
  EmailCampaign,
  EmailTemplate,
  TalentNetworkAudienceFilter,
} from "@/app/common/types/campaigns.type";
import PermissionGuard from "../../components/PermissionGuard";
import CampaignStatusBadge from "./CampaignStatusBadge";
import AudienceQuickPicks from "./AudienceQuickPicks";
import TalentNetworkAudiencePicker from "./TalentNetworkAudiencePicker";
import EmailSequenceCard from "./EmailSequenceCard";
import EmailStepEditor from "./EmailStepEditor";

const EDITABLE_STATUSES = ["DRAFT", "SCHEDULED", "PAUSED"];

const audienceToPayload = (audience: AudienceValue) => {
  if (audience.type === "ALL_USERS") return { audience_type: "ALL" as const, audience_segment: null, audience_tag: null, manual_organisation_ids: [] };
  if (audience.type === "SEGMENT") return { audience_type: "SEGMENT" as const, audience_segment: audience.segment_id, audience_tag: null, manual_organisation_ids: [] };
  if (audience.type === "TAG") return { audience_type: "TAG" as const, audience_segment: null, audience_tag: audience.tag_id, manual_organisation_ids: [] };
  if (audience.type === "MANUAL") return { audience_type: "MANUAL" as const, audience_segment: null, audience_tag: null, manual_organisation_ids: audience.organisations.map(o => o.id) };
  return { audience_type: "ALL" as const, audience_segment: null, audience_tag: null, manual_organisation_ids: [] };
};

const initialAudienceFrom = (campaign: EmailCampaign): AudienceValue => {
  if (campaign.audience_type === "SEGMENT") return { type: "SEGMENT", segment_id: campaign.audience_segment };
  if (campaign.audience_type === "TAG") return { type: "TAG", tag_id: campaign.audience_tag };
  if (campaign.audience_type === "MANUAL") return { type: "MANUAL", organisations: [] };
  return { type: "ALL_USERS" };
};

const SummaryRow = ({ label, value }: { label: string; value: string }) => (
  <div className="flex items-center justify-between px-4 py-3 text-sm">
    <span className="text-[#9E9E9E]">{label}</span>
    <span className="font-medium text-[#444444]">{value}</span>
  </div>
);

const CampaignBuilder = ({ initialCampaign }: { initialCampaign: EmailCampaign }) => {
  const router = useRouter();
  const [campaign, setCampaign] = useState(initialCampaign);
  const [name, setName] = useState(initialCampaign.name);
  const [audiencePool, setAudiencePool] = useState<CampaignAudiencePool>(initialCampaign.audience_pool);
  const [audience, setAudience] = useState<AudienceValue>(initialAudienceFrom(initialCampaign));
  const [tnFilter, setTnFilter] = useState<TalentNetworkAudienceFilter>({
    tn_role_categories: initialCampaign.tn_role_categories,
    tn_industries: initialCampaign.tn_industries,
    tn_years_experience: initialCampaign.tn_years_experience,
    tn_work_type: initialCampaign.tn_work_type,
  });
  const [scheduleType, setScheduleType] = useState<CampaignScheduleType>(initialCampaign.schedule_type);
  const [scheduledFor, setScheduledFor] = useState<Date | null>(
    initialCampaign.scheduled_for ? new Date(initialCampaign.scheduled_for) : null
  );

  const [emails, setEmails] = useState<CampaignEmail[]>(
    [...initialCampaign.emails].sort((a, b) => a.sequence_number - b.sequence_number)
  );
  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [audiencePreview, setAudiencePreview] = useState<AudiencePreview | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [editingStepId, setEditingStepId] = useState<string | null>(null);
  const [previewStepId, setPreviewStepId] = useState<string | null>(emails[0]?.id ?? null);

  const [savingStep, setSavingStep] = useState(false);
  const [addingStep, setAddingStep] = useState(false);
  const [sendingTest, setSendingTest] = useState(false);
  const [confirming, setConfirming] = useState(false);

  const testModalRef = useRef<HTMLDialogElement>(null);
  const confirmModalRef = useRef<HTMLDialogElement>(null);
  const isFirstRun = useRef(true);

  const isEditable = EDITABLE_STATUSES.includes(campaign.status);

  useEffect(() => {
    (async () => {
      try {
        const data = await clientKyInstance.get("campaigns/templates/").json<EmailTemplate[]>();
        setTemplates(data);
      } catch {
        setTemplates([]);
      }
    })();
  }, []);

  // Debounced autosave + live recipient-count preview whenever the audience
  // definition changes -- keeps "what you see" and "who gets emailed" in
  // sync without a manual save step.
  useEffect(() => {
    if (!isEditable) return;
    if (isFirstRun.current) {
      isFirstRun.current = false;
      // Still fetch an initial preview for a freshly-created campaign.
    }
    setPreviewLoading(true);
    const timeout = setTimeout(async () => {
      const previewPayload =
        audiencePool === "TALENT_NETWORK"
          ? { audience_pool: "TALENT_NETWORK" as const, ...tnFilter }
          : { audience_pool: "COMPANY" as const, ...audienceToPayload(audience) };

      try {
        const preview = await previewCampaignAudience(previewPayload);
        setAudiencePreview(preview);
      } catch {
        setAudiencePreview(null);
      } finally {
        setPreviewLoading(false);
      }

      const result = await updateCampaign(campaign.id, previewPayload);
      if (result.success) setCampaign(result.data);
    }, 600);
    return () => clearTimeout(timeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [audiencePool, JSON.stringify(audience), JSON.stringify(tnFilter)]);

  useEffect(() => {
    if (!isEditable) return;
    const timeout = setTimeout(async () => {
      const result = await updateCampaign(campaign.id, {
        schedule_type: scheduleType,
        scheduled_for: scheduleType === "SCHEDULED" && scheduledFor ? scheduledFor.toISOString() : null,
      });
      if (result.success) setCampaign(result.data);
    }, 600);
    return () => clearTimeout(timeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scheduleType, scheduledFor?.toISOString()]);

  const handleNameBlur = async () => {
    const trimmed = name.trim() || "Untitled campaign";
    setName(trimmed);
    if (!isEditable || trimmed === campaign.name) return;
    const result = await updateCampaign(campaign.id, { name: trimmed });
    if (result.success) setCampaign(result.data);
    else toast.error(result.error);
  };

  const handleAddStep = async () => {
    setAddingStep(true);
    const result = await createCampaignEmail(campaign.id, {});
    setAddingStep(false);
    if (!result.success) {
      toast.error(result.error);
      return;
    }
    setEmails(prev => [...prev, result.data]);
    setEditingStepId(result.data.id);
  };

  const handleRemoveStep = async (emailId: string) => {
    const result = await deleteCampaignEmail(campaign.id, emailId);
    if (!result.success) {
      toast.error(result.error);
      return;
    }
    setEmails(prev => prev.filter(e => e.id !== emailId));
    if (previewStepId === emailId) setPreviewStepId(emails.find(e => e.id !== emailId)?.id ?? null);
    toast.success("Email removed from sequence.");
  };

  const handleDelayChange = async (emailId: string, patch: Partial<CampaignEmailPayload>) => {
    setEmails(prev => prev.map(e => (e.id === emailId ? { ...e, ...patch } as CampaignEmail : e)));
    const result = await updateCampaignEmail(campaign.id, emailId, patch);
    if (result.success) {
      setEmails(prev => prev.map(e => (e.id === emailId ? result.data : e)));
    } else {
      toast.error(result.error);
    }
  };

  const handleSaveStep = async (
    emailId: string,
    draft: { email_template: string | null; subject: string; preview_text: string; from_name: string; reply_to: string }
  ) => {
    setSavingStep(true);
    const result = await updateCampaignEmail(campaign.id, emailId, {
      email_template: draft.email_template,
      subject: draft.subject,
      preview_text: draft.preview_text,
      from_name: draft.from_name,
      reply_to: draft.reply_to || null,
    });
    setSavingStep(false);
    if (!result.success) {
      toast.error(result.error);
      return;
    }
    setEmails(prev => prev.map(e => (e.id === emailId ? result.data : e)));
    setEditingStepId(null);
    setPreviewStepId(emailId);
    toast.success("Email saved.");
  };

  const handleSendTest = async () => {
    setSendingTest(true);
    const result = await sendTestCampaignEmail(campaign.id, previewStepId ?? undefined);
    setSendingTest(false);
    if (!result.success) {
      toast.error(result.error);
      return;
    }
    toast.success(`Test email sent to ${result.data.to}.`);
  };

  const handleConfirmSend = async () => {
    setConfirming(true);
    const result = await sendCampaign(campaign.id);
    setConfirming(false);
    if (!result.success) {
      toast.error(result.error);
      return;
    }
    toast.success(result.data.status === "scheduled" ? "Campaign scheduled." : "Campaign is sending.");
    router.push(result.data.status === "scheduled" ? "/admin/campaigns" : `/admin/campaigns/${campaign.id}/analytics`);
  };

  const handlePause = async () => {
    const result = await pauseCampaign(campaign.id);
    if (!result.success) {
      toast.error(result.error);
      return;
    }
    toast.success("Campaign paused -- already-dispatched sends are unaffected.");
    router.refresh();
    setCampaign(c => ({ ...c, status: "PAUSED" }));
  };

  const handleResume = async () => {
    const result = await resumeCampaign(campaign.id);
    if (!result.success) {
      toast.error(result.error);
      return;
    }
    toast.success("Campaign resumed.");
    router.refresh();
    setCampaign(c => ({ ...c, status: "SENDING" }));
  };

  const handleCancel = async () => {
    const result = await cancelCampaign(campaign.id);
    if (!result.success) {
      toast.error(result.error);
      return;
    }
    toast.success("Campaign cancelled.");
    router.push("/admin/campaigns");
  };

  const sortedEmails = [...emails].sort((a, b) => a.sequence_number - b.sequence_number);
  const editingStep = emails.find(e => e.id === editingStepId) ?? null;
  const previewStep = sortedEmails.find(e => e.id === previewStepId) ?? sortedEmails[0] ?? null;
  const previewTemplate = previewStep ? templates.find(t => t.id === previewStep.email_template) ?? null : null;
  const firstStepReady = Boolean(sortedEmails[0]?.email_template);

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3 border-b border-[#E0E0E0] pb-4">
        <div className="flex min-w-0 flex-1 items-center gap-3">
          <Link href="/admin/campaigns" className="shrink-0 text-sm text-[#9E9E9E] hover:text-[#444444]">
            &larr; Campaigns
          </Link>
          <input
            className="min-w-0 flex-1 border-none bg-transparent text-xl font-bold text-[#1A3C5E] outline-none disabled:text-[#444444]"
            value={name}
            disabled={!isEditable}
            maxLength={120}
            onChange={e => setName(e.target.value)}
            onBlur={handleNameBlur}
          />
          <CampaignStatusBadge status={campaign.status} />
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {campaign.status === "SENDING" && (
            <button type="button" className="btn btn-sm btn-outline" onClick={handlePause}>
              Pause
            </button>
          )}
          {campaign.status === "PAUSED" && (
            <button type="button" className="btn btn-sm btn-outline" onClick={handleResume}>
              Resume
            </button>
          )}
          {["SCHEDULED", "SENDING", "PAUSED"].includes(campaign.status) && (
            <button type="button" className="btn btn-sm btn-ghost text-red-600" onClick={handleCancel}>
              Cancel
            </button>
          )}
          {isEditable && (
            <>
              <button type="button" className="btn btn-sm btn-outline" onClick={() => testModalRef.current?.showModal()}>
                Send test
              </button>
              <button
                type="button"
                className="btn btn-sm text-white hover:opacity-90"
                style={{ backgroundColor: "#1A3C5E" }}
                disabled={!firstStepReady}
                onClick={() => confirmModalRef.current?.showModal()}
              >
                {scheduleType === "IMMEDIATE" ? "Send campaign" : "Schedule campaign"}
              </button>
            </>
          )}
          {!isEditable && campaign.status !== "DRAFT" && (
            <Link href={`/admin/campaigns/${campaign.id}/analytics`} className="btn btn-sm btn-outline">
              View report
            </Link>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_400px]">
        <div className="flex flex-col gap-6">
          <section className="rounded-lg border border-[#E0E0E0] bg-white p-5">
            <h3 className="mb-1 text-sm font-semibold text-[#1A3C5E]">Audience</h3>
            <p className="mb-4 text-xs text-[#9E9E9E]">Who should receive this campaign?</p>

            <div className="mb-4 flex w-fit overflow-hidden rounded-md border border-[#E0E0E0]">
              <button
                type="button"
                disabled={!isEditable}
                className={`px-3 py-1.5 text-sm ${audiencePool === "COMPANY" ? "bg-[#1A3C5E] text-white" : "bg-white text-[#444444]"}`}
                onClick={() => setAudiencePool("COMPANY")}
              >
                Companies
              </button>
              <button
                type="button"
                disabled={!isEditable}
                className={`px-3 py-1.5 text-sm ${audiencePool === "TALENT_NETWORK" ? "bg-[#1A3C5E] text-white" : "bg-white text-[#444444]"}`}
                onClick={() => setAudiencePool("TALENT_NETWORK")}
              >
                Talent Network
              </button>
            </div>

            {audiencePool === "COMPANY" ? (
              <>
                <AudienceQuickPicks value={audience} onChange={setAudience} />
                <details className="mt-3">
                  <summary className="cursor-pointer text-xs font-medium text-[#1A3C5E]">More audience options</summary>
                  <div className="mt-3">
                    <AudiencePicker options={["SEGMENT", "TAG", "MANUAL"]} value={audience} onChange={setAudience} />
                  </div>
                </details>
              </>
            ) : (
              <TalentNetworkAudiencePicker value={tnFilter} onChange={setTnFilter} />
            )}

            <div className="mt-4 rounded-md bg-[#F4F4F4] p-3">
              {previewLoading ? (
                <p className="text-sm text-[#9E9E9E]">Calculating...</p>
              ) : audiencePreview ? (
                <>
                  <div className="text-2xl font-bold text-[#1A3C5E]">{audiencePreview.estimated_recipients}</div>
                  <p className="text-xs text-[#9E9E9E]">
                    estimated recipients
                    {audiencePreview.total_organisations != null ? ` across ${audiencePreview.total_organisations} organisation(s)` : ""}
                  </p>
                  {audiencePreview.excluded_unsubscribed > 0 && (
                    <p className="mt-1 text-xs text-amber-600">{audiencePreview.excluded_unsubscribed} excluded (previously unsubscribed)</p>
                  )}
                </>
              ) : (
                <p className="text-sm text-[#9E9E9E]">Select an audience to see an estimate.</p>
              )}
            </div>
          </section>

          <section className="rounded-lg border border-[#E0E0E0] bg-white p-5">
            <h3 className="mb-1 text-sm font-semibold text-[#1A3C5E]">Timing</h3>
            <p className="mb-4 text-xs text-[#9E9E9E]">When should the first email go out?</p>
            <div className="mb-4 flex gap-2">
              <button
                type="button"
                disabled={!isEditable}
                className="btn btn-sm"
                style={scheduleType === "IMMEDIATE" ? { backgroundColor: "#1A3C5E", color: "#fff", border: "none" } : { backgroundColor: "#fff", border: "1px solid #E0E0E0", color: "#444444" }}
                onClick={() => setScheduleType("IMMEDIATE")}
              >
                Send immediately
              </button>
              <button
                type="button"
                disabled={!isEditable}
                className="btn btn-sm"
                style={scheduleType === "SCHEDULED" ? { backgroundColor: "#1A3C5E", color: "#fff", border: "none" } : { backgroundColor: "#fff", border: "1px solid #E0E0E0", color: "#444444" }}
                onClick={() => setScheduleType("SCHEDULED")}
              >
                Schedule for later
              </button>
            </div>
            {scheduleType === "SCHEDULED" && <DateTimePicker value={scheduledFor} onChange={setScheduledFor} minDate={new Date()} />}
          </section>

          <section className="rounded-lg border border-[#E0E0E0] bg-white p-5">
            <h3 className="mb-1 text-sm font-semibold text-[#1A3C5E]">Email sequence</h3>
            <p className="mb-4 text-xs text-[#9E9E9E]">A single email, or a multi-step drip -- add as many as you need.</p>
            <div className="flex flex-col gap-1">
              {sortedEmails.map(step => (
                <div key={step.id} onClick={() => setPreviewStepId(step.id)} className="cursor-pointer">
                  <EmailSequenceCard
                    step={step}
                    template={templates.find(t => t.id === step.email_template) ?? null}
                    disabled={!isEditable}
                    onEdit={() => setEditingStepId(step.id)}
                    onRemove={step.sequence_number > 1 ? () => handleRemoveStep(step.id) : undefined}
                    onDelayChange={patch => handleDelayChange(step.id, patch)}
                  />
                </div>
              ))}
            </div>
            {isEditable && (
              <button
                type="button"
                className="mt-4 w-full rounded-lg border-2 border-dashed border-[#E0E0E0] py-3 text-sm font-medium text-[#1A3C5E] hover:bg-[#F4F4F4]"
                disabled={addingStep}
                onClick={handleAddStep}
              >
                {addingStep ? "Adding..." : "+ Add another email"}
              </button>
            )}
          </section>
        </div>

        <div className="lg:sticky lg:top-6 lg:self-start">
          <section className="rounded-lg border border-[#E0E0E0] bg-white p-4">
            <h3 className="mb-3 text-sm font-semibold text-[#1A3C5E]">Live preview</h3>
            {previewTemplate ? (
              <div className="overflow-hidden rounded-md border border-[#E0E0E0]">
                <iframe title="Email preview" srcDoc={previewTemplate.html_body} className="h-[560px] w-full border-0" />
              </div>
            ) : (
              <div className="flex h-[560px] items-center justify-center rounded-md border border-dashed border-[#E0E0E0] text-center text-sm text-[#9E9E9E] px-6">
                Select or edit an email to preview it here
              </div>
            )}
            {sortedEmails.length > 1 && (
              <div className="mt-3 flex flex-wrap gap-1.5">
                {sortedEmails.map(step => (
                  <button
                    key={step.id}
                    type="button"
                    onClick={() => setPreviewStepId(step.id)}
                    className="rounded px-2 py-1 text-xs"
                    style={previewStepId === step.id ? { backgroundColor: "#1A3C5E", color: "#fff" } : { backgroundColor: "#F4F4F4", color: "#444444" }}
                  >
                    Email {step.sequence_number}
                  </button>
                ))}
              </div>
            )}
          </section>
        </div>
      </div>

      {editingStep && (
        <SlideOver
          open={!!editingStepId}
          onClose={() => setEditingStepId(null)}
          title={`Edit Email ${editingStep.sequence_number}`}
          subtitle={audiencePool === "TALENT_NETWORK" ? "Talent Network recipients" : "Company recipients"}
        >
          <EmailStepEditor step={editingStep} templates={templates} onSave={draft => handleSaveStep(editingStep.id, draft)} saving={savingStep} />
        </SlideOver>
      )}

      <Modal id="campaign-send-test-modal" modalRef={testModalRef} autoHeight>
        <h3 className="mb-2 text-lg font-semibold text-[#1A3C5E]">Send a test email</h3>
        <p className="mb-4 text-sm text-[#9E9E9E]">
          Sends &ldquo;{previewStep?.subject || previewTemplate?.subject_line || "this email"}&rdquo; to your own admin address, using sample
          data.
        </p>
        <button
          type="button"
          className="btn w-full text-white hover:opacity-90"
          style={{ backgroundColor: "#1A3C5E" }}
          disabled={sendingTest || !previewTemplate}
          onClick={handleSendTest}
        >
          {sendingTest ? "Sending..." : "Send test"}
        </button>
      </Modal>

      <Modal id="campaign-confirm-send-modal" modalRef={confirmModalRef} autoHeight>
        <h3 className="mb-4 text-lg font-semibold text-[#1A3C5E]">
          {scheduleType === "IMMEDIATE" ? "Send this campaign now?" : "Schedule this campaign?"}
        </h3>
        <div className="mb-4 divide-y rounded-lg border border-[#E0E0E0]">
          <SummaryRow label="Audience" value={audiencePool === "TALENT_NETWORK" ? "Talent Network" : "Companies"} />
          <SummaryRow label="Estimated recipients" value={String(audiencePreview?.estimated_recipients ?? "—")} />
          <SummaryRow label="Emails in sequence" value={String(sortedEmails.length)} />
          <SummaryRow
            label="Schedule"
            value={scheduleType === "IMMEDIATE" ? "Immediately" : scheduledFor ? scheduledFor.toLocaleString() : "—"}
          />
        </div>
        <PermissionGuard permission="campaigns.send" fallback={<p className="text-sm text-[#9E9E9E]">You don&apos;t have permission to send campaigns.</p>}>
          <button
            type="button"
            className="btn w-full text-white hover:opacity-90"
            style={{ backgroundColor: "#1A3C5E" }}
            disabled={confirming}
            onClick={handleConfirmSend}
          >
            {confirming ? "Working..." : scheduleType === "IMMEDIATE" ? "Confirm and send" : "Confirm and schedule"}
          </button>
        </PermissionGuard>
      </Modal>
    </div>
  );
};

export default CampaignBuilder;
