import { Fragment, useState, type FormEvent, type ReactNode } from "react";
import { ArrowRight, Check, FileUp, Send } from "lucide-react";
import {
  useCreateMessage,
  type HomePageSection,
  type HomePageTextBox,
} from "@workspace/api-client-react";
import {
  contentAlignmentClasses,
  featureGridClasses,
  heroHeightClasses,
  imageColumnsClasses,
  sectionAccentBackground,
  sectionAccentBorder,
  sectionAccentColor,
  sectionCopyColor,
  sectionHeadingColor,
  sectionSpacingClasses,
  sectionStyleVariables,
  sectionSurfaceClasses,
} from "./homepage-section-style";

const heroFallback = "/workshop-hero.png";
const messageError = (error: unknown) =>
  error instanceof Error ? error.message : "Something went wrong. Please try again.";

export function HomepageSections({
  sections,
  afterHero,
}: {
  sections: HomePageSection[];
  afterHero: ReactNode;
}) {
  const ordered = [...sections].sort((a, b) => a.order - b.order);
  let insertedProductShelf = false;

  return (
    <>
      {ordered.map((section) => {
        const insertShelf = !insertedProductShelf && section.type === "hero";
        if (insertShelf) insertedProductShelf = true;

        return (
          <Fragment key={section.id}>
            <HomepageSectionView section={section} />
            {insertShelf && afterHero}
          </Fragment>
        );
      })}
      {!insertedProductShelf && afterHero}
    </>
  );
}

function HomepageSectionView({ section }: { section: HomePageSection }) {
  const { content } = section;
  const { style } = section;
  const anchor = `block-${section.id}`;
  const surface = sectionSurfaceClasses(style);
  const spacing = sectionSpacingClasses(style);
  const alignment = contentAlignmentClasses(style);
  const vars = sectionStyleVariables(style);

  if (section.type === "hero") {
    const image = (
      <SectionImage
        src={content.imageUrl}
        alt={content.title}
        className="max-h-[520px] min-h-64 w-full object-cover"
      />
    );
    const copy = (
      <div className={`flex w-full max-w-[720px] flex-col ${alignment}`}>
        {content.subtitle && (
          <div className={`mb-6 flex items-center gap-3 font-mono text-[10px] uppercase tracking-[.22em] ${sectionAccentColor}`}>
            {style.align !== "right" && <span className={`h-px w-10 ${sectionAccentBackground}`} />}
            {content.subtitle}
            {style.align === "right" && <span className={`h-px w-10 ${sectionAccentBackground}`} />}
          </div>
        )}
        <h1 className={`font-display text-[clamp(4rem,10vw,8.8rem)] font-bold uppercase leading-[.81] tracking-[-.035em] ${sectionHeadingColor}`}>
          {content.title}
        </h1>
        {content.bodyText && (
          <p className={`mt-8 max-w-[500px] whitespace-pre-line text-sm leading-7 sm:text-base ${sectionCopyColor}`}>
            {content.bodyText}
          </p>
        )}
        {content.buttonText && (
          <a
            href={content.buttonUrl || "#shop"}
            className={`group mt-9 inline-flex h-12 items-center gap-7 ${sectionAccentBackground} px-5 text-[11px] font-bold uppercase tracking-[.16em] text-[#171819] transition hover:brightness-110`}
          >
            {content.buttonText}
            <ArrowRight size={16} className="transition-transform group-hover:translate-x-1" />
          </a>
        )}
        {content.textBoxes.length > 0 && <TextBoxList boxes={content.textBoxes} />}
      </div>
    );
    const imagePosition = style.imagePosition;

    return (
      <section
        id={anchor}
        style={vars}
        className={`relative isolate overflow-hidden border-b border-white/10 ${surface} ${
          imagePosition === "background"
            ? heroHeightClasses(style)
            : spacing
        }`}
      >
        {imagePosition === "background" && (
          <>
            <SectionImage
              src={content.imageUrl || heroFallback}
              alt=""
              className="absolute inset-0 h-full w-full object-cover object-center"
            />
            <div className="absolute inset-0 bg-gradient-to-r from-[#111315]/95 via-[#111315]/75 to-[#111315]/25" />
            <div className="absolute inset-0 bg-gradient-to-t from-[#111315]/80 via-transparent to-[#111315]/25" />
          </>
        )}
        <div className={`relative z-10 mx-auto flex w-full max-w-[1440px] flex-col px-6 lg:px-14 ${imagePosition === "background" ? "min-h-[inherit] justify-center py-20 md:py-24" : ""}`}>
          {imagePosition === "background" ? (
            <div className={`flex w-full ${alignment}`}>
              {copy}
            </div>
          ) : imagePosition === "top" ? (
            <>
              {image}
              {copy}
            </>
          ) : (
            <div className={imageColumnsClasses(style, imagePosition === "left")}>
              {imagePosition === "left" && image}
              {copy}
              {imagePosition === "right" && image}
            </div>
          )}
        </div>
      </section>
    );
  }

  if (section.type === "banner") {
    const image = <SectionImage src={content.imageUrl} alt={content.title} className="max-h-80 w-full object-cover" />;
    const copy = (
      <div className={`flex flex-col ${alignment}`}>
        {content.subtitle && (
          <span className={`font-mono text-[9px] uppercase tracking-[.2em] ${sectionAccentColor}`}>
            {content.subtitle}
          </span>
        )}
        <h2 className={`mt-3 font-display text-4xl font-bold uppercase ${sectionHeadingColor}`}>
          {content.title}
        </h2>
        {content.bodyText && (
          <p className={`mt-3 max-w-2xl whitespace-pre-line text-sm leading-7 ${sectionCopyColor}`}>
            {content.bodyText}
          </p>
        )}
        {content.buttonText && (
          <a
            href={content.buttonUrl || "#shop"}
            className={`mt-5 inline-flex items-center gap-2 text-[10px] font-bold uppercase tracking-[.17em] ${sectionAccentColor} hover:brightness-125`}
          >
            {content.buttonText}
            <ArrowRight size={15} />
          </a>
        )}
        {content.textBoxes.length > 0 && <TextBoxList boxes={content.textBoxes} />}
      </div>
    );

    return (
      <section id={anchor} style={vars} className={`${surface} ${spacing}`}>
        <div className="mx-auto flex w-full max-w-[1440px] flex-col gap-7 px-5 lg:px-10">
          {style.imagePosition === "background" && content.imageUrl ? (
            <div className="relative isolate overflow-hidden">
              <SectionImage
                src={content.imageUrl}
                alt=""
                className="absolute inset-0 z-0 h-full w-full object-cover"
              />
              <div className="absolute inset-0 z-0 bg-[#111315]/75" />
              <div className={`relative z-10 p-6 sm:p-10 ${alignment}`}>{copy}</div>
            </div>
          ) : style.imagePosition === "top" ? (
            <>
              {image}
              {copy}
            </>
          ) : content.imageUrl ? (
            <div className={imageColumnsClasses(style, style.imagePosition === "left")}>
              {style.imagePosition === "left" && image}
              {copy}
              {style.imagePosition === "right" && image}
            </div>
          ) : copy}
        </div>
      </section>
    );
  }

  if (section.type === "text_image") {
    const image = (
      <SectionImage
        src={content.imageUrl}
        alt={content.title}
        className="max-h-[520px] min-h-64 w-full object-cover"
      />
    );
    const copy = (
      <div className={`flex flex-col ${alignment}`}>
        {content.subtitle && (
          <span className={`font-mono text-[10px] uppercase tracking-[.22em] ${sectionAccentColor}`}>
            {content.subtitle}
          </span>
        )}
        <h2 className={`mt-4 max-w-xl font-display text-5xl font-bold uppercase leading-[.88] sm:text-7xl ${sectionHeadingColor}`}>
          {content.title}
        </h2>
        {content.bodyText && (
          <p className={`mt-6 max-w-lg whitespace-pre-line text-sm leading-7 ${sectionCopyColor}`}>
            {content.bodyText}
          </p>
        )}
        {content.buttonText && (
          <a
            href={content.buttonUrl || "#shop"}
            className={`mt-7 inline-flex items-center gap-2 text-[10px] font-bold uppercase tracking-[.17em] ${sectionAccentColor} hover:brightness-125`}
          >
            {content.buttonText}
            <ArrowRight size={15} />
          </a>
        )}
        {content.textBoxes.length > 0 && <TextBoxList boxes={content.textBoxes} />}
      </div>
    );

    return (
      <section id={anchor} style={vars} className={`${surface} ${spacing}`}>
        <div className="mx-auto w-full max-w-[1440px] px-5 lg:px-10">
          {style.imagePosition === "background" && content.imageUrl ? (
            <div className="relative isolate overflow-hidden">
              <SectionImage
                src={content.imageUrl}
                alt=""
                className="absolute inset-0 z-0 h-full w-full object-cover"
              />
              <div className="absolute inset-0 z-0 bg-[#111315]/80" />
              <div className={`relative z-10 p-6 sm:p-10 ${alignment}`}>{copy}</div>
            </div>
          ) : style.imagePosition === "top" ? (
            <div className={`flex flex-col gap-8 ${style.align === "center" ? "items-center" : ""}`}>
              {image}
              {copy}
            </div>
          ) : content.imageUrl ? (
            <div className={imageColumnsClasses(style, style.imagePosition === "left")}>
              {style.imagePosition === "left" && image}
              {copy}
              {style.imagePosition === "right" && image}
            </div>
          ) : copy}
        </div>
      </section>
    );
  }

  if (section.type === "features") {
    const image = <SectionImage src={content.imageUrl} alt={content.title} className="max-h-96 w-full object-cover" />;
    const copyAndCards = (
      <>
        <div className={alignment}>
          {content.subtitle && (
            <span className={`font-mono text-[10px] uppercase tracking-[.2em] ${sectionAccentColor}`}>
              {content.subtitle}
            </span>
          )}
          <h2 className={`mt-4 font-display text-5xl font-bold uppercase leading-[.88] ${sectionHeadingColor}`}>
            {content.title}
          </h2>
          {content.bodyText && (
            <p className={`mt-5 whitespace-pre-line text-sm leading-7 ${sectionCopyColor}`}>
              {content.bodyText}
            </p>
          )}
        </div>
        {content.featureItems.length > 0 && (
          <div className={`mt-9 ${featureGridClasses(style)}`}>
            {content.featureItems.map((item) => (
              <article key={item.id} className="border border-white/10 bg-black/10 p-5">
                <h3 className={`font-display text-2xl uppercase ${sectionHeadingColor}`}>{item.title}</h3>
                {item.bodyText && (
                  <p className={`mt-2 text-xs leading-6 ${sectionCopyColor}`}>{item.bodyText}</p>
                )}
              </article>
            ))}
          </div>
        )}
        {content.textBoxes.length > 0 && <TextBoxList boxes={content.textBoxes} />}
        {content.buttonText && (
          <a
            href={content.buttonUrl || "#shop"}
            className={`mt-8 inline-flex items-center gap-2 text-[10px] font-bold uppercase tracking-[.17em] ${sectionAccentColor}`}
          >
            {content.buttonText}
            <ArrowRight size={15} />
          </a>
        )}
      </>
    );

    return (
      <section id={anchor} style={vars} className={`${surface} ${spacing}`}>
        <div className="mx-auto w-full max-w-[1440px] px-5 lg:px-10">
          {style.imagePosition === "background" && content.imageUrl ? (
            <div className="relative isolate overflow-hidden">
              <SectionImage
                src={content.imageUrl}
                alt=""
                className="absolute inset-0 z-0 h-full w-full object-cover"
              />
              <div className="absolute inset-0 z-0 bg-[#111315]/80" />
              <div className="relative z-10 p-6 sm:p-10">{copyAndCards}</div>
            </div>
          ) : style.imagePosition === "top" ? (
            <div className="space-y-8">
              {image}
              {copyAndCards}
            </div>
          ) : content.imageUrl ? (
            <div className={imageColumnsClasses(style, style.imagePosition === "left")}>
              {style.imagePosition === "left" && image}
              {copyAndCards}
              {style.imagePosition === "right" && image}
            </div>
          ) : copyAndCards}
        </div>
      </section>
    );
  }

  return <CustomFormSection section={section} anchor={anchor} />;
}

function SectionImage({
  src,
  alt,
  className,
}: {
  src: string;
  alt: string;
  className: string;
}) {
  if (!src) return null;
  return <img src={src} alt={alt} className={className} />;
}

function TextBoxList({ boxes }: { boxes: HomePageTextBox[] }) {
  return (
    <div className="mt-7 grid gap-3 sm:grid-cols-2">
      {boxes.map((box) => (
        <article key={box.id} className={`border-l ${sectionAccentBorder} bg-white/[.03] px-4 py-3 text-left`}>
          {box.title && (
            <h3 className={`font-display text-xl uppercase ${sectionHeadingColor}`}>{box.title}</h3>
          )}
          {box.bodyText && (
            <p className={`mt-1 whitespace-pre-line text-xs leading-6 ${sectionCopyColor}`}>
              {box.bodyText}
            </p>
          )}
        </article>
      ))}
    </div>
  );
}

function CustomFormSection({
  section,
  anchor,
}: {
  section: HomePageSection;
  anchor: string;
}) {
  const { content } = section;
  const { style } = section;
  const createMessage = useCreateMessage();
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");
  const [fileName, setFileName] = useState("");
  const isPrintRequest = content.formKind === "print_request";
  const alignment = contentAlignmentClasses(style);
  const vars = sectionStyleVariables(style);
  const image = (
    <SectionImage
      src={content.imageUrl}
      alt={content.title}
      className="max-h-80 w-full object-cover"
    />
  );

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    const form = event.currentTarget;
    const values = new FormData(form);
    createMessage.mutate(
      {
        data: {
          kind: content.formKind,
          name: String(values.get("name")).trim(),
          email: String(values.get("email")).trim(),
          details: String(values.get("details")).trim(),
          fileName: isPrintRequest ? fileName || null : null,
        },
      },
      {
        onSuccess: () => {
          setSent(true);
          setFileName("");
          form.reset();
        },
        onError: (submitError) => setError(messageError(submitError)),
      },
    );
  };

  const intro = (
    <div className={`flex flex-col ${alignment}`}>
      {style.imagePosition === "left" && image}
      {content.subtitle && (
        <span className={`font-mono text-[10px] uppercase tracking-[.22em] ${sectionAccentColor}`}>
          {content.subtitle}
        </span>
      )}
      <h2 className={`mt-4 font-display text-5xl font-bold uppercase leading-[.88] sm:text-6xl ${sectionHeadingColor}`}>
        {content.title}
      </h2>
      {content.bodyText && (
        <p className={`mt-6 whitespace-pre-line text-sm leading-7 ${sectionCopyColor}`}>
          {content.bodyText}
        </p>
      )}
      {style.imagePosition === "right" && image}
      {content.textBoxes.length > 0 && <TextBoxList boxes={content.textBoxes} />}
    </div>
  );

  const formPanel = (
    <div className="border border-white/10 bg-[#191b1d]/95 p-6 sm:p-9">
          {sent ? (
            <div className="flex min-h-[320px] flex-col items-start justify-center">
              <span className={`grid h-11 w-11 place-items-center border ${sectionAccentBorder} ${sectionAccentColor}`}>
                <Check size={20} />
              </span>
              <h3 className={`mt-6 font-display text-4xl uppercase ${sectionHeadingColor}`}>
                {isPrintRequest ? "On our bench." : "Message on its way."}
              </h3>
              <p className={`mt-2 max-w-sm text-sm leading-6 ${sectionCopyColor}`}>
                Thanks for the note. We’ll read it and get back to you directly.
              </p>
              <button
                onClick={() => setSent(false)}
                className={`mt-7 text-[10px] font-bold uppercase tracking-widest ${sectionAccentColor}`}
              >
                Send another
              </button>
            </div>
          ) : (
            <form onSubmit={submit} className="space-y-5">
              <div className="flex items-center justify-between border-b border-white/10 pb-4">
                <h3 className={`font-display text-3xl font-bold uppercase ${sectionHeadingColor}`}>
                  {isPrintRequest ? "Custom print request" : "Send a message"}
                </h3>
                {isPrintRequest ? (
                  <FileUp size={19} className={sectionAccentColor} />
                ) : (
                  <Send size={18} className={sectionAccentColor} />
                )}
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <MessageField label="Your name" name="name" required />
                <MessageField label="Email address" name="email" type="email" required />
              </div>
              <label className="block">
                  <span className="mb-2 block font-mono text-[9px] uppercase tracking-[.16em] text-[#929491]">
                  {isPrintRequest ? "What are we making?" : "Message"}
                </span>
                <textarea
                  name="details"
                  required
                  minLength={isPrintRequest ? 5 : 3}
                  rows={4}
                  placeholder={
                    isPrintRequest
                      ? "Tell us what it does, what it fits, and any dimensions you have."
                      : "What can we help with?"
                  }
                  className="w-full resize-y border border-white/10 bg-[#121416] px-3 py-3 text-sm text-[#ece8df] outline-none focus:border-[color:var(--section-accent)]"
                />
              </label>
              {isPrintRequest && (
                <label className="flex cursor-pointer items-center gap-3 border border-dashed border-white/15 px-4 py-3 text-xs text-[#aaa9a2] transition hover:border-[color:var(--section-accent)]">
                  <FileUp size={16} className={sectionAccentColor} />
                  <span>{fileName || "Attach an STL file name (optional)"}</span>
                  <input
                    type="file"
                    accept=".stl"
                    className="sr-only"
                    onChange={(event) => setFileName(event.target.files?.[0]?.name || "")}
                  />
                </label>
              )}
              {error && <p role="alert" className="text-xs text-[#ff8b65]">{error}</p>}
              <button
                disabled={createMessage.isPending}
                className={`flex h-12 w-full items-center justify-between ${sectionAccentBackground} px-4 text-[10px] font-bold uppercase tracking-[.17em] text-[#171819] transition hover:brightness-110 disabled:opacity-50`}
              >
                <span>
                  {createMessage.isPending
                    ? "Sending…"
                    : content.buttonText ||
                      (isPrintRequest ? "Send to the workshop" : "Send message")}
                </span>
                <ArrowRight size={16} />
              </button>
            </form>
          )}
    </div>
  );

  return (
    <section
      id={anchor}
      style={vars}
      className={`relative isolate ${sectionSurfaceClasses(style)} ${sectionSpacingClasses(style)}`}
    >
      {style.imagePosition === "background" && content.imageUrl && (
        <>
          <SectionImage
            src={content.imageUrl}
            alt=""
            className="absolute inset-0 z-0 h-full w-full object-cover"
          />
          <div className="absolute inset-0 z-0 bg-[#111315]/80" />
        </>
      )}
      <div className="relative z-10 mx-auto flex w-full max-w-[1440px] flex-col gap-8 px-5 lg:px-10">
        {style.imagePosition === "top" && image}
        <div className={imageColumnsClasses(style, false)}>
          {intro}
          {formPanel}
        </div>
      </div>
    </section>
  );
}

function MessageField({
  label,
  name,
  type = "text",
  required = false,
}: {
  label: string;
  name: string;
  type?: string;
  required?: boolean;
}) {
  return (
    <label className="block">
      <span className="mb-2 block font-mono text-[9px] uppercase tracking-[.16em] text-[#929491]">
        {label}
      </span>
      <input
        name={name}
        type={type}
        required={required}
        className="h-11 w-full border border-white/10 bg-[#121416] px-3 text-sm text-[#ece8df] outline-none focus:border-[#ed6228]"
      />
    </label>
  );
}
