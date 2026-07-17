"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import AudiencePicker, { AudienceValue } from "@/app/common/components/dashboard/AudiencePicker";
import DateTimePicker from "@/app/common/components/dashboard/DateTimePicker";
import clientKyInstance from "@/app/common/utils/client-ky.instance";
import {
  createCampaign,
  previewCampaignAudience,
  sendCampaign,
  sendTestCampaignEmail,
  updateCampaign,
} from "@/app/common/services/campaigns";
import { AudiencePreview, CampaignScheduleType, EmailCampaign, EmailTemplate } from "@/app/common/types/campaigns.type";
import StepIndicator from "./StepIndicator";
import TemplateStep from "./steps/TemplateStep";
import CustomiseStep from "./steps/CustomiseStep";

const scrollToTop = () => window.scrollTo({ top: 0, behavior: "smooth" });

const audienceToPayload = (audience: AudienceValue) => {
  if (audience.type === "SEGMENT") return { audience_type: "SEGMENT" as const, audience_segment: audience.segment_id, audience_tag: null, manual_organisation_ids: [] };
  if (audience.type === "TAG") return { audience_type: "TAG" as const, audience_segment: null, audience_tag: audience.tag_id, manual_organisation_ids: [] };
  if (audience.type === "MANUAL") return { audience_type: "MANUAL" as const, audience_segment: null, audience_tag: null, manual_organisation_ids: audience.organisations.map(o => o.id) };
  return { audience_type: "MANUAL" as const, audience_segment: null, audience_tag: null, manual_organisation_ids: [] };
};

const initialAudienceFrom = (campaign: EmailCampaign | null): AudienceValue => {
  if (!campaign) return { type: "SEGMENT", segment_id: null };
  if (campaign.audience_type === "SEGMENT") return { type: "SEGMENT", segment_id: campaign.audience_segment };
  if (campaign.audience_type === "TAG") return { type: "TAG", tag_id: campaign.audience_tag };
  if (campaign.audience_type === "MANUAL") return { type: "MANUAL", organisations: [] };
  return { type: "SEGMENT", segment_id: null };
};

const CampaignWizard = ({ initialCampaign }: { initialCampaign: EmailCampaign | null }) => {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [campaignId, setCampaignId] = useState<string | null>(initialCampaign?.id ?? null);

  const [name, setName] = useState(initialCampaign?.name ?? "");
  const [audience, setAudience] = useState<AudienceValue>(initialAudienceFrom(initialCampaign));
  const [audiencePreview, setAudiencePreview] = useState<AudiencePreview | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);

  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [templateId, setTemplateId] = useState<string | null>(initialCampaign?.email_template ?? null);

  const [subjectLine, setSubjectLine] = useState(initialCampaign?.subject_line ?? "");
  const [previewText, setPreviewText] = useState(initialCampaign?.preview_text ?? "");

  const [scheduleType, setScheduleType] = useState<CampaignScheduleType>(initialCampaign?.schedule_type ?? "IMMEDIATE");
  const [scheduledFor, setScheduledFor] = useState<Date | null>(
    initialCampaign?.scheduled_for ? new Date(initialCampaign.scheduled_for) : null
  );

  const [saving, setSaving] = useState(false);
  const [sendingTest, setSendingTest] = useState(false);
  const [confirming, setConfirming] = useState(false);

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

  useEffect(() => {
    if (step !== 1) return;
    const payload = audienceToPayload(audience);
    if (!payload.audience_segment && !payload.audience_tag && !payload.manual_organisation_ids.length) {
      setAudiencePreview(null);
      return;
    }
    setPreviewLoading(true);
    const timeout = setTimeout(async () => {
      try {
        const data = await previewCampaignAudience(payload);
        setAudiencePreview(data);
      } catch {
        setAudiencePreview(null);
      } finally {
        setPreviewLoading(false);
      }
    }, 500);
    return () => clearTimeout(timeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step, JSON.stringify(audience)]);

  const selectedTemplate = templates.find(t => t.id === templateId) ?? null;

  const onSelectTemplate = (template: EmailTemplate) => {
    setTemplateId(template.id);
    if (!subjectLine) setSubjectLine(template.subject_line);
    if (!previewText) setPreviewText(template.preview_text);
  };

  const goNext = async () => {
    if (step === 0 && !name.trim()) {
      toast.error("Campaign name is required.");
      return;
    }
    if (step === 1) {
      const payload = audienceToPayload(audience);
      if (!payload.audience_segment && !payload.audience_tag && !payload.manual_organisation_ids.length) {
        toast.error("Select an audience.");
        return;
      }
    }
    if (step === 2 && !templateId) {
      toast.error("Select a template.");
      return;
    }
    if (step === 3 && !subjectLine.trim()) {
      toast.error("Subject line is required.");
      return;
    }
    if (step === 4 && scheduleType === "SCHEDULED" && !scheduledFor) {
      toast.error("Pick a date and time to schedule for.");
      return;
    }

    if (step === 4) {
      // Entering Review -- persist the draft so send-test/send have a real id.
      const saved = await saveDraft();
      if (!saved) return;
    }

    setStep(s => Math.min(s + 1, 5));
    scrollToTop();
  };

  const goBack = () => {
    setStep(s => Math.max(0, s - 1));
    scrollToTop();
  };

  const saveDraft = async () => {
    setSaving(true);
    const audiencePayload = audienceToPayload(audience);
    const payload = {
      name: name.trim(),
      subject_line: subjectLine.trim(),
      preview_text: previewText.trim(),
      email_template: templateId,
      schedule_type: scheduleType,
      scheduled_for: scheduleType === "SCHEDULED" && scheduledFor ? scheduledFor.toISOString() : null,
      ...audiencePayload,
    };
    const result = campaignId ? await updateCampaign(campaignId, payload) : await createCampaign(payload);
    setSaving(false);
    if (!result.success) {
      toast.error(result.error);
      return false;
    }
    setCampaignId(result.data.id);
    return true;
  };

  const handleSendTest = async () => {
    if (!campaignId) return;
    setSendingTest(true);
    const result = await sendTestCampaignEmail(campaignId);
    setSendingTest(false);
    if (!result.success) {
      toast.error(result.error);
      return;
    }
    toast.success(`Test email sent to ${result.data.to}.`);
  };

  const handleConfirmSend = async () => {
    if (!campaignId) return;
    setConfirming(true);
    const saved = await saveDraft();
    if (!saved) {
      setConfirming(false);
      return;
    }
    const result = await sendCampaign(campaignId);
    setConfirming(false);
    if (!result.success) {
      toast.error(result.error);
      return;
    }
    toast.success(result.data.status === "scheduled" ? "Campaign scheduled." : "Campaign is sending.");
    router.push("/admin/campaigns");
  };

  return (
    <div>
      <StepIndicator step={step} />

      {step === 0 && (
        <div className="max-w-lg">
          <label className="text-sm font-medium">Campaign name</label>
          <input
            type="text"
            className="input input-bordered w-full mt-2"
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="e.g. March win-back push"
            maxLength={120}
          />
          <p className="text-xs text-muted-foreground mt-2">Internal name only -- recipients never see this.</p>
        </div>
      )}

      {step === 1 && (
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-6">
          <div>
            <AudiencePicker options={["SEGMENT", "TAG", "MANUAL"]} value={audience} onChange={setAudience} />
          </div>
          <div className="border rounded-lg p-4 h-fit">
            <h4 className="font-semibold mb-3 text-sm">Recipient preview</h4>
            {previewLoading ? (
              <p className="text-sm text-muted-foreground">Calculating...</p>
            ) : audiencePreview ? (
              <>
                <div className="text-2xl font-bold">{audiencePreview.estimated_recipients}</div>
                <p className="text-xs text-muted-foreground mb-3">
                  estimated recipients across {audiencePreview.total_organisations} organisation(s)
                </p>
                {audiencePreview.excluded_unsubscribed > 0 && (
                  <p className="text-xs text-amber-600 mb-3">
                    {audiencePreview.excluded_unsubscribed} excluded (previously unsubscribed)
                  </p>
                )}
                <h5 className="text-xs font-semibold text-muted-foreground uppercase mb-1">Sample recipients</h5>
                <ul className="text-sm">
                  {audiencePreview.sample_recipients.map(r => (
                    <li key={r.company_id} className="py-0.5">
                      {r.name} &lt;{r.email}&gt;
                    </li>
                  ))}
                </ul>
              </>
            ) : (
              <p className="text-sm text-muted-foreground">Select an audience to see an estimate.</p>
            )}
          </div>
        </div>
      )}

      {step === 2 && <TemplateStep templates={templates} selectedId={templateId} onSelect={onSelectTemplate} />}

      {step === 3 && (
        <CustomiseStep
          template={selectedTemplate}
          subjectLine={subjectLine}
          previewText={previewText}
          onSubjectLineChange={setSubjectLine}
          onPreviewTextChange={setPreviewText}
        />
      )}

      {step === 4 && (
        <div className="max-w-lg flex flex-col gap-4">
          <div className="flex gap-2">
            <button type="button" className={`btn btn-sm ${scheduleType === "IMMEDIATE" ? "btn-primary" : "btn-outline"}`} onClick={() => setScheduleType("IMMEDIATE")}>
              Send immediately
            </button>
            <button type="button" className={`btn btn-sm ${scheduleType === "SCHEDULED" ? "btn-primary" : "btn-outline"}`} onClick={() => setScheduleType("SCHEDULED")}>
              Schedule for later
            </button>
          </div>
          {scheduleType === "IMMEDIATE" ? (
            <p className="text-sm text-muted-foreground">
              This campaign will be sent as soon as you confirm on the next step, to an estimated{" "}
              {audiencePreview?.estimated_recipients ?? "—"} recipients.
            </p>
          ) : (
            <>
              <label className="text-sm font-medium">Send at</label>
              <DateTimePicker value={scheduledFor} onChange={setScheduledFor} minDate={new Date()} />
              {scheduledFor && (
                <p className="text-xs text-muted-foreground">
                  Local time: {scheduledFor.toLocaleString()} &middot; UTC:{" "}
                  {scheduledFor.toISOString().slice(0, 16).replace("T", " ")}
                </p>
              )}
            </>
          )}
        </div>
      )}

      {step === 5 && (
        <div className="max-w-2xl flex flex-col gap-6">
          <div className="border rounded-lg divide-y">
            <SummaryRow label="Name" value={name} />
            <SummaryRow label="Audience" value={audience.type} />
            <SummaryRow label="Template" value={selectedTemplate?.name ?? "—"} />
            <SummaryRow label="Subject line" value={subjectLine} />
            <SummaryRow
              label="Schedule"
              value={scheduleType === "IMMEDIATE" ? "Immediate" : `Scheduled for ${scheduledFor ? scheduledFor.toLocaleString() : "—"}`}
            />
            <SummaryRow label="Estimated recipients" value={String(audiencePreview?.estimated_recipients ?? "—")} />
          </div>

          <div className="flex items-center gap-3">
            <button type="button" className="btn btn-outline" disabled={sendingTest || !campaignId} onClick={handleSendTest}>
              {sendingTest ? "Sending..." : "Send test email to me"}
            </button>
            <button type="button" className="btn btn-primary" disabled={confirming} onClick={handleConfirmSend}>
              {confirming ? "Working..." : scheduleType === "IMMEDIATE" ? "Confirm and send" : "Confirm and schedule"}
            </button>
          </div>
        </div>
      )}

      <div className="flex items-center gap-3 mt-8 pt-6 border-t">
        {step > 0 && (
          <button type="button" className="btn btn-ghost" onClick={goBack}>
            Previous
          </button>
        )}
        {step < 5 && (
          <button type="button" className="btn btn-primary" disabled={saving} onClick={goNext}>
            {saving ? "Saving..." : "Next"}
          </button>
        )}
      </div>
    </div>
  );
};

const SummaryRow = ({ label, value }: { label: string; value: string }) => (
  <div className="flex items-center justify-between px-4 py-3 text-sm">
    <span className="text-muted-foreground">{label}</span>
    <span className="font-medium">{value}</span>
  </div>
);

export default CampaignWizard;
