import { useEffect, useRef, useState, type FormEvent } from "react";
import {
  ArrowDown,
  ArrowRight,
  ArrowUp,
  Check,
  CircleAlert,
  Image as ImageIcon,
  LayoutTemplate,
  Plus,
  Trash2,
  X,
} from "lucide-react";
import type {
  HomePageFeatureItem,
  HomePageSection,
  HomePageSectionContent,
  HomePageSectionType,
  HomePageTextBox,
  SiteContent,
  SiteContentInput,
} from "@workspace/api-client-react";

const sectionKinds: { type: HomePageSectionType; label: string; detail: string }[] = [
  { type: "hero", label: "Hero", detail: "Large opening image, headline, and button" },
  { type: "banner", label: "Banner", detail: "Compact, full-width message or promotion" },
  { type: "text_image", label: "Text + image", detail: "Story or editorial content beside an image" },
  { type: "features", label: "Features", detail: "Highlights arranged in a responsive grid" },
  { type: "custom_form", label: "Custom form", detail: "Contact or custom-print inquiry form" },
];

const blankContent = (): HomePageSectionContent => ({
  title: "",
  subtitle: "",
  bodyText: "",
  imageUrl: "",
  buttonText: "",
  buttonUrl: "",
  formKind: "print_request",
  textBoxes: [],
  featureItems: [],
});

function createId(prefix: string): string {
  return `${prefix}-${globalThis.crypto.randomUUID()}`;
}

function createSection(type: HomePageSectionType, order: number): HomePageSection {
  const content = blankContent();
  const defaults: Record<HomePageSectionType, Partial<HomePageSectionContent>> = {
    hero: { title: "New headline", subtitle: "A short introduction", buttonText: "Explore", buttonUrl: "#shop" },
    banner: { title: "New banner", subtitle: "A short label" },
    text_image: { title: "New story", bodyText: "Add the details for this section." },
    features: { title: "New features", featureItems: [] },
    custom_form: { title: "Get in touch" },
  };

  return {
    id: createId(type),
    type,
    order,
    layout: type === "text_image" ? "image_right" : "centered",
    content: { ...content, ...defaults[type] },
  };
}

const sectionLabel = (type: HomePageSectionType) =>
  sectionKinds.find((kind) => kind.type === type)?.label ?? type;

export function AdminSiteContentBuilder({
  content,
  loading,
  error,
  pending,
  retry,
  onSave,
}: {
  content: SiteContent | null;
  loading: boolean;
  error: string;
  pending: boolean;
  retry: () => void;
  onSave: (data: SiteContentInput) => void;
}) {
  const initialized = useRef(false);
  const [sections, setSections] = useState<HomePageSection[]>([]);
  const [selectedId, setSelectedId] = useState("");
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [newType, setNewType] = useState<HomePageSectionType>("banner");
  const [contactDetails, setContactDetails] = useState({
    contactEmail: "",
    contactPhone: "",
    instagramUrl: "",
    facebookUrl: "",
  });
  const [validationError, setValidationError] = useState("");

  useEffect(() => {
    if (!content || initialized.current) return;
    initialized.current = true;
    const sortedSections = [...content.sections].sort((a, b) => a.order - b.order);
    setSections(sortedSections);
    setSelectedId(sortedSections[0]?.id ?? "");
    setContactDetails({
      contactEmail: content.contactEmail,
      contactPhone: content.contactPhone,
      instagramUrl: content.instagramUrl,
      facebookUrl: content.facebookUrl,
    });
  }, [content]);

  const selected = sections.find((section) => section.id === selectedId) ?? null;

  const updateSection = (
    id: string,
    patch: Partial<HomePageSectionContent>,
  ) => {
    setSections((current) =>
      current.map((section) =>
        section.id === id
          ? { ...section, content: { ...section.content, ...patch } }
          : section,
      ),
    );
  };

  const moveSection = (index: number, direction: -1 | 1) => {
    setSections((current) => {
      const next = [...current];
      const target = index + direction;
      if (target < 0 || target >= next.length) return current;
      [next[index], next[target]] = [next[target], next[index]];
      return next.map((section, order) => ({ ...section, order }));
    });
  };

  const addSection = () => {
    const section = createSection(newType, sections.length);
    setSections((current) => [...current, section]);
    setSelectedId(section.id);
    setShowAddDialog(false);
  };

  const deleteSection = (id: string) => {
    const removedIndex = sections.findIndex((section) => section.id === id);
    const next = sections
      .filter((section) => section.id !== id)
      .map((section, order) => ({ ...section, order }));
    setSections(next);
    if (selectedId === id) {
      setSelectedId(next[Math.min(removedIndex, next.length - 1)]?.id ?? "");
    }
  };

  const save = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setValidationError("");
    if (!content) {
      setValidationError("Site content has not loaded yet. Try again.");
      return;
    }
    if (sections.length > 25) {
      setValidationError("A page can contain up to 25 sections.");
      return;
    }

    onSave({
      heroTitle: content.heroTitle,
      heroSubtitle: content.heroSubtitle,
      heroImageUrl: content.heroImageUrl,
      aboutTitle: content.aboutTitle,
      aboutBody: content.aboutBody,
      ...contactDetails,
      sections: sections.map((section, order) => ({ ...section, order })),
    });
  };

  if (loading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((item) => (
          <div key={item} className="h-16 animate-pulse bg-white/[.05]" />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="border border-[#702f21] bg-[#321b17] p-8 text-center">
        <CircleAlert size={22} className="mx-auto text-[#ef7040]" />
        <p className="mt-3 text-sm text-[#ddd1c9]">{error}</p>
        <button
          onClick={retry}
          className="mt-4 font-mono text-[9px] font-bold uppercase tracking-widest text-[#ef7040]"
        >
          Retry
        </button>
      </div>
    );
  }

  if (!content) {
    return <p className="text-sm text-[#aaa]">Site content is not available.</p>;
  }

  return (
    <form onSubmit={save} className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4 border-b border-white/10 pb-5">
        <div>
          <span className="font-mono text-[8px] uppercase tracking-[.18em] text-[#ed7441]">
            Storefront CMS
          </span>
          <h2 className="mt-2 font-display text-3xl uppercase">Homepage sections</h2>
          <p className="mt-1 max-w-2xl text-xs leading-5 text-[#858783]">
            Add, edit, and reorder the blocks visitors see. Save publishes the new page content.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setShowAddDialog(true)}
          disabled={sections.length >= 25}
          className="flex h-10 items-center gap-2 border border-[#ed6228] px-4 text-[9px] font-bold uppercase tracking-[.15em] text-[#ed7441] transition hover:bg-[#ed6228] hover:text-[#171819] disabled:cursor-not-allowed disabled:opacity-40"
        >
          <Plus size={15} />
          Add new section
        </button>
      </div>

      <div className="grid gap-5 xl:grid-cols-[300px_minmax(0,1fr)]">
        <aside className="space-y-2">
          <div className="mb-3 flex items-center justify-between">
            <span className="font-mono text-[9px] uppercase tracking-widest text-[#858783]">
              Page order · {sections.length} blocks
            </span>
          </div>
          {sections.map((section, index) => (
            <article
              key={section.id}
              className={`border bg-[#191b1d] ${
                selectedId === section.id ? "border-[#ed6228]/70" : "border-white/10"
              }`}
            >
              <button
                type="button"
                onClick={() => setSelectedId(section.id)}
                className="flex w-full items-start gap-3 p-3 text-left"
              >
                <span className="grid h-7 w-7 shrink-0 place-items-center border border-white/10 font-mono text-[9px] text-[#ed7441]">
                  {String(index + 1).padStart(2, "0")}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-display text-lg uppercase text-[#eee9df]">
                    {section.content.title || "Untitled section"}
                  </span>
                  <span className="mt-1 block font-mono text-[8px] uppercase tracking-widest text-[#777]">
                    {sectionLabel(section.type)}
                  </span>
                </span>
              </button>
              <div className="flex items-center justify-between border-t border-white/[.06] px-3 py-2">
                <button
                  type="button"
                  aria-label={`Move ${section.content.title || sectionLabel(section.type)} up`}
                  disabled={index === 0}
                  onClick={() => moveSection(index, -1)}
                  className="grid h-7 w-7 place-items-center text-[#aaa] hover:text-[#ed7441] disabled:cursor-not-allowed disabled:opacity-30"
                >
                  <ArrowUp size={14} />
                </button>
                <button
                  type="button"
                  aria-label={`Move ${section.content.title || sectionLabel(section.type)} down`}
                  disabled={index === sections.length - 1}
                  onClick={() => moveSection(index, 1)}
                  className="grid h-7 w-7 place-items-center text-[#aaa] hover:text-[#ed7441] disabled:cursor-not-allowed disabled:opacity-30"
                >
                  <ArrowDown size={14} />
                </button>
                <span className="flex-1" />
                <button
                  type="button"
                  aria-label={`Delete ${section.content.title || sectionLabel(section.type)}`}
                  onClick={() => deleteSection(section.id)}
                  className="grid h-7 w-7 place-items-center text-[#cf806d] hover:text-[#ff9c80]"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </article>
          ))}
          {!sections.length && (
            <div className="border border-dashed border-white/15 p-6 text-center">
              <LayoutTemplate size={20} className="mx-auto text-[#777]" />
              <p className="mt-3 font-display text-xl uppercase">No sections yet</p>
              <p className="mt-1 text-xs text-[#858783]">
                Add a section to start building the homepage.
              </p>
            </div>
          )}
        </aside>

        <div className="min-w-0 border border-white/10 bg-[#191b1d] p-5 sm:p-7">
          {selected ? (
            <SectionEditor
              section={selected}
              onChange={(patch) => updateSection(selected.id, patch)}
              onLayoutChange={(layout) =>
                setSections((current) =>
                  current.map((section) =>
                    section.id === selected.id ? { ...section, layout } : section,
                  ),
                )
              }
            />
          ) : (
            <div className="grid min-h-64 place-items-center text-center">
              <div>
                <LayoutTemplate size={22} className="mx-auto text-[#777]" />
                <p className="mt-3 font-display text-2xl uppercase text-[#d8d2c7]">
                  Select a section to edit
                </p>
                <p className="mt-1 text-xs text-[#858783]">
                  Or add a new section to this homepage.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      <details className="border border-white/10 bg-[#191b1d]">
        <summary className="cursor-pointer list-none px-5 py-4 font-mono text-[9px] font-bold uppercase tracking-widest text-[#b9b9b1]">
          Store contact details and social links
        </summary>
        <div className="grid gap-4 border-t border-white/10 p-5 sm:grid-cols-2">
          <SettingsField
            label="Contact email"
            type="email"
            value={contactDetails.contactEmail}
            onChange={(contactEmail) => setContactDetails((current) => ({ ...current, contactEmail }))}
          />
          <SettingsField
            label="Contact phone"
            value={contactDetails.contactPhone}
            onChange={(contactPhone) => setContactDetails((current) => ({ ...current, contactPhone }))}
          />
          <SettingsField
            label="Instagram URL"
            value={contactDetails.instagramUrl}
            onChange={(instagramUrl) => setContactDetails((current) => ({ ...current, instagramUrl }))}
          />
          <SettingsField
            label="Facebook URL"
            value={contactDetails.facebookUrl}
            onChange={(facebookUrl) => setContactDetails((current) => ({ ...current, facebookUrl }))}
          />
        </div>
      </details>

      {(validationError || error) && (
        <p role="alert" className="text-xs text-[#ff8b65]">
          {validationError || error}
        </p>
      )}
      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-white/10 pt-5">
        <p className="max-w-xl text-[10px] leading-5 text-[#777]">
          Homepage changes are visible to visitors as soon as the save succeeds.
        </p>
        <button
          disabled={pending}
          className="flex h-11 items-center justify-between gap-8 bg-[#ed6228] px-4 text-[9px] font-bold uppercase tracking-[.17em] text-[#171819] disabled:opacity-50"
        >
          <span>{pending ? "Saving changes…" : "Save changes"}</span>
          {pending ? <span className="animate-pulse">…</span> : <Check size={15} />}
        </button>
      </div>

      {showAddDialog && (
        <div
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setShowAddDialog(false);
          }}
          className="fixed inset-0 z-[90] grid place-items-center bg-black/75 p-4"
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="add-section-title"
            className="w-full max-w-lg border border-white/10 bg-[#191b1d] p-6 shadow-2xl"
          >
            <div className="flex items-start justify-between">
              <div>
                <span className="font-mono text-[8px] uppercase tracking-widest text-[#ed7441]">
                  Page builder
                </span>
                <h2 id="add-section-title" className="mt-2 font-display text-3xl uppercase">
                  Add a section
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setShowAddDialog(false)}
                aria-label="Close add section dialog"
                className="text-[#aaa] hover:text-white"
              >
                <X size={18} />
              </button>
            </div>
            <label className="mt-6 block">
              <span className="mb-2 block font-mono text-[9px] uppercase tracking-widest text-[#929491]">
                Section type
              </span>
              <select
                value={newType}
                onChange={(event) => setNewType(event.target.value as HomePageSectionType)}
                className="h-11 w-full border border-white/10 bg-[#121416] px-3 text-sm text-[#eee9df]"
              >
                {sectionKinds.map((kind) => (
                  <option key={kind.type} value={kind.type}>
                    {kind.label} — {kind.detail}
                  </option>
                ))}
              </select>
            </label>
            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setShowAddDialog(false)}
                className="h-11 border border-white/15 px-4 text-[9px] font-bold uppercase tracking-widest text-[#aaa]"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={addSection}
                disabled={sections.length >= 25}
                className="flex h-11 items-center gap-2 bg-[#ed6228] px-4 text-[9px] font-bold uppercase tracking-widest text-[#171819] disabled:cursor-not-allowed disabled:opacity-40"
              >
                <Plus size={14} />
                Add section
              </button>
            </div>
          </div>
        </div>
      )}
    </form>
  );
}

function SectionEditor({
  section,
  onChange,
  onLayoutChange,
}: {
  section: HomePageSection;
  onChange: (patch: Partial<HomePageSectionContent>) => void;
  onLayoutChange: (layout: HomePageSection["layout"]) => void;
}) {
  const { content } = section;
  const updateTextBox = (id: string, patch: Partial<HomePageTextBox>) =>
    onChange({
      textBoxes: content.textBoxes.map((box) =>
        box.id === id ? { ...box, ...patch } : box,
      ),
    });
  const updateFeature = (id: string, patch: Partial<HomePageFeatureItem>) =>
    onChange({
      featureItems: content.featureItems.map((item) =>
        item.id === id ? { ...item, ...patch } : item,
      ),
    });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-white/10 pb-4">
        <div>
          <span className="font-mono text-[8px] uppercase tracking-widest text-[#ed7441]">
            {sectionLabel(section.type)} · order {section.order + 1}
          </span>
          <h3 className="mt-1 font-display text-2xl uppercase">
            {content.title || "Untitled section"}
          </h3>
          <p className="mt-1 font-mono text-[8px] text-[#707371]">
            Link target: #{`block-${section.id}`}
          </p>
        </div>
        <label className="block w-44">
          <span className="mb-2 block font-mono text-[8px] uppercase tracking-widest text-[#777]">
            Layout
          </span>
          <select
            value={section.layout}
            onChange={(event) =>
              onLayoutChange(event.target.value as HomePageSection["layout"])
            }
            className="h-9 w-full border border-white/10 bg-[#121416] px-2 text-xs text-[#ddd]"
          >
            <option value="image_left">Image left</option>
            <option value="image_right">Image right</option>
            <option value="centered">Centered</option>
          </select>
        </label>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <SettingsField
          label="Title"
          value={content.title}
          onChange={(title) => onChange({ title })}
        />
        <SettingsField
          label="Subtitle"
          value={content.subtitle}
          onChange={(subtitle) => onChange({ subtitle })}
        />
        <label className="block sm:col-span-2">
          <span className="mb-2 block font-mono text-[9px] uppercase tracking-widest text-[#929491]">
            Body text
          </span>
          <textarea
            rows={4}
            value={content.bodyText}
            onChange={(event) => onChange({ bodyText: event.target.value })}
            className="w-full resize-y border border-white/10 bg-[#121416] px-3 py-3 text-sm leading-6 text-[#ece8df] outline-none focus:border-[#ed6228]"
          />
        </label>
      </div>

      {(section.type === "hero" ||
        section.type === "banner" ||
        section.type === "text_image" ||
        section.type === "custom_form") && (
        <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_180px]">
          <SettingsField
            label="Image URL"
            value={content.imageUrl}
            onChange={(imageUrl) => onChange({ imageUrl })}
          />
          <ImagePreview src={content.imageUrl} />
        </div>
      )}

      {(section.type === "hero" ||
        section.type === "banner" ||
        section.type === "text_image" ||
        section.type === "features") && (
        <div className="grid gap-4 border-t border-white/[.06] pt-5 sm:grid-cols-2">
          <SettingsField
            label="Button text"
            value={content.buttonText}
            onChange={(buttonText) => onChange({ buttonText })}
          />
          <SettingsField
            label="Button URL"
            value={content.buttonUrl}
            onChange={(buttonUrl) => onChange({ buttonUrl })}
            placeholder="#shop or https://example.com"
          />
        </div>
      )}

      {section.type === "custom_form" && (
        <div className="grid gap-4 border-t border-white/[.06] pt-5 sm:grid-cols-2">
          <label className="block">
            <span className="mb-2 block font-mono text-[9px] uppercase tracking-widest text-[#929491]">
              Form purpose
            </span>
            <select
              value={content.formKind}
              onChange={(event) =>
                onChange({ formKind: event.target.value as HomePageSectionContent["formKind"] })
              }
              className="h-10 w-full border border-white/10 bg-[#121416] px-3 text-sm text-[#ece8df]"
            >
              <option value="print_request">Custom print request (STL filename)</option>
              <option value="contact">Contact message</option>
            </select>
          </label>
          <SettingsField
            label="Submit button text"
            value={content.buttonText}
            onChange={(buttonText) => onChange({ buttonText })}
          />
        </div>
      )}

      {section.type === "features" && (
        <div className="border-t border-white/[.06] pt-5">
          <div className="mb-3 flex items-center justify-between gap-3">
            <div>
              <h4 className="font-mono text-[9px] font-bold uppercase tracking-widest text-[#bcbcb4]">
                Feature cards
              </h4>
              <p className="mt-1 text-[10px] text-[#777]">Add short highlights in a responsive grid.</p>
            </div>
            <button
              type="button"
              disabled={content.featureItems.length >= 12}
              onClick={() =>
                onChange({
                  featureItems: [
                    ...content.featureItems,
                    { id: createId("feature"), title: "", bodyText: "" },
                  ],
                })
              }
              className="flex h-8 items-center gap-1 border border-white/15 px-3 text-[8px] font-bold uppercase tracking-widest text-[#ccc] disabled:opacity-40"
            >
              <Plus size={12} />
              Add card
            </button>
          </div>
          <div className="space-y-3">
            {content.featureItems.map((item) => (
              <div key={item.id} className="grid gap-3 border border-white/10 p-3 sm:grid-cols-2">
                <SettingsField
                  label="Card title"
                  value={item.title}
                  onChange={(title) => updateFeature(item.id, { title })}
                />
                <SettingsField
                  label="Card text"
                  value={item.bodyText}
                  onChange={(bodyText) => updateFeature(item.id, { bodyText })}
                />
                <button
                  type="button"
                  onClick={() =>
                    onChange({
                      featureItems: content.featureItems.filter((feature) => feature.id !== item.id),
                    })
                  }
                  className="flex items-center gap-2 text-[8px] font-bold uppercase tracking-widest text-[#ce806c] sm:col-span-2"
                >
                  <Trash2 size={12} />
                  Remove card
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="border-t border-white/[.06] pt-5">
        <div className="mb-3 flex items-center justify-between gap-3">
          <div>
            <h4 className="font-mono text-[9px] font-bold uppercase tracking-widest text-[#bcbcb4]">
              Extra text boxes
            </h4>
            <p className="mt-1 text-[10px] text-[#777]">
              Optional supporting copy, lists, or small callouts.
            </p>
          </div>
          <button
            type="button"
            disabled={content.textBoxes.length >= 12}
            onClick={() =>
              onChange({
                textBoxes: [
                  ...content.textBoxes,
                  { id: createId("text"), title: "", bodyText: "" },
                ],
              })
            }
            className="flex h-8 items-center gap-1 border border-white/15 px-3 text-[8px] font-bold uppercase tracking-widest text-[#ccc] disabled:opacity-40"
          >
            <Plus size={12} />
            Add text box
          </button>
        </div>
        <div className="space-y-3">
          {content.textBoxes.map((box) => (
            <div key={box.id} className="grid gap-3 border border-white/10 p-3 sm:grid-cols-2">
              <SettingsField
                label="Box title"
                value={box.title}
                onChange={(title) => updateTextBox(box.id, { title })}
              />
              <SettingsField
                label="Box text"
                value={box.bodyText}
                onChange={(bodyText) => updateTextBox(box.id, { bodyText })}
              />
              <button
                type="button"
                onClick={() =>
                  onChange({
                    textBoxes: content.textBoxes.filter((current) => current.id !== box.id),
                  })
                }
                className="flex items-center gap-2 text-[8px] font-bold uppercase tracking-widest text-[#ce806c] sm:col-span-2"
              >
                <Trash2 size={12} />
                Remove text box
              </button>
            </div>
          ))}
          {!content.textBoxes.length && (
            <p className="border border-dashed border-white/10 p-4 text-xs text-[#777]">
              No extra text boxes. Add one for supporting copy or a short list.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

function SettingsField({
  label,
  value,
  type = "text",
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  type?: string;
  onChange: (value: string) => void;
  placeholder?: string;
}) {
  return (
    <label className="block">
      <span className="mb-2 block font-mono text-[9px] uppercase tracking-widest text-[#929491]">
        {label}
      </span>
      <input
        type={type}
        value={value}
        placeholder={placeholder}
        onChange={(event) => onChange(event.target.value)}
        className="h-10 w-full border border-white/10 bg-[#121416] px-3 text-sm text-[#ece8df] outline-none focus:border-[#ed6228]"
      />
    </label>
  );
}

function ImagePreview({ src }: { src: string }) {
  const [failed, setFailed] = useState(false);
  useEffect(() => setFailed(false), [src]);

  return (
    <div className="flex h-24 items-center justify-center overflow-hidden border border-white/10 bg-[#121416]">
      {src && !failed ? (
        <img
          src={src}
          alt="Section image preview"
          className="h-full w-full object-cover"
          onError={() => setFailed(true)}
        />
      ) : (
        <span className="flex items-center gap-2 font-mono text-[8px] uppercase tracking-widest text-[#777]">
          <ImageIcon size={14} />
          {src ? "Preview unavailable" : "No image selected"}
        </span>
      )}
    </div>
  );
}
