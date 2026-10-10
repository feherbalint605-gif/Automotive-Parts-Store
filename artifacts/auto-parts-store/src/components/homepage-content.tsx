import { Fragment, useState, type FormEvent, type ReactNode } from "react";
import { ArrowRight, Check, FileUp, Send } from "lucide-react";
import {
  useCreateMessage,
  type HomePageSection,
  type HomePageTextBox,
} from "@workspace/api-client-react";

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
  const anchor = `block-${section.id}`;

  if (section.type === "hero") {
    return (
      <section
        id={anchor}
        className="relative isolate min-h-[640px] overflow-hidden border-b border-white/10 sm:min-h-[700px]"
      >
        <img
          src={content.imageUrl || heroFallback}
          alt=""
          className="absolute inset-0 -z-20 h-full w-full object-cover object-center"
        />
        <div className="absolute inset-0 -z-10 bg-gradient-to-r from-[#111315] via-[#111315]/85 to-[#111315]/20" />
        <div className="absolute inset-0 -z-10 bg-gradient-to-t from-[#111315] via-transparent to-[#111315]/35" />
        <div
          className={`mx-auto flex min-h-[640px] max-w-[1440px] items-center px-6 py-20 sm:min-h-[700px] lg:px-14 ${
            section.layout === "centered"
              ? "justify-center text-center"
              : section.layout === "image_left"
                ? "justify-start text-left"
                : "justify-end text-right"
          }`}
        >
          <div className="max-w-[720px]">
            {content.subtitle && (
              <div className="mb-6 flex items-center gap-3 font-mono text-[10px] uppercase tracking-[.22em] text-[#f17a48]">
                <span className="h-px w-10 bg-[#ed6228]" />
                {content.subtitle}
              </div>
            )}
            <h1 className="font-display text-[clamp(4rem,10vw,8.8rem)] font-bold uppercase leading-[.81] tracking-[-.035em] text-[#f3eee4]">
              {content.title}
            </h1>
            {content.bodyText && (
              <p className="mt-8 max-w-[500px] text-sm leading-7 text-[#c3c0b8] sm:text-base">
                {content.bodyText}
              </p>
            )}
            {content.buttonText && (
              <a
                href={content.buttonUrl || "#shop"}
                className="group mt-9 inline-flex h-12 items-center gap-7 bg-[#ed6228] px-5 text-[11px] font-bold uppercase tracking-[.16em] text-[#171819] transition hover:bg-[#ff7840]"
              >
                {content.buttonText}
                <ArrowRight size={16} className="transition-transform group-hover:translate-x-1" />
              </a>
            )}
            {content.textBoxes.length > 0 && (
              <TextBoxList boxes={content.textBoxes} />
            )}
          </div>
        </div>
        <div className="absolute bottom-10 right-6 hidden font-mono text-[9px] uppercase tracking-[.2em] text-white/50 [writing-mode:vertical-rl] md:block">
          Redline Works · Est. in the garage
        </div>
      </section>
    );
  }

  if (section.type === "banner") {
    return (
      <section id={anchor} className="carbon border-y border-white/10">
        <div
          className={`mx-auto flex max-w-[1440px] flex-col gap-7 px-5 py-14 lg:px-10 lg:py-16 ${
            section.layout === "centered"
              ? "items-center text-center"
              : section.layout === "image_left"
                ? "items-start text-left"
                : "items-end text-right"
          }`}
        >
          {content.subtitle && (
            <span className="font-mono text-[9px] uppercase tracking-[.2em] text-[#ed7441]">
              {content.subtitle}
            </span>
          )}
          <h2 className="font-display text-4xl font-bold uppercase text-[#eee9df]">
            {content.title}
          </h2>
          {content.bodyText && (
            <p className="max-w-2xl text-sm leading-7 text-[#aaa9a3]">
              {content.bodyText}
            </p>
          )}
          {content.imageUrl && (
            <img
              src={content.imageUrl}
              alt=""
              className="max-h-80 w-full max-w-4xl object-cover"
            />
          )}
          {content.buttonText && (
            <a
              href={content.buttonUrl || "#shop"}
              className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[.17em] text-[#ee7441] hover:text-[#ff9868]"
            >
              {content.buttonText}
              <ArrowRight size={15} />
            </a>
          )}
          {content.textBoxes.length > 0 && <TextBoxList boxes={content.textBoxes} />}
        </div>
      </section>
    );
  }

  if (section.type === "text_image") {
    const image =
      content.imageUrl &&
      <img
        src={content.imageUrl}
        alt={content.title}
        className="max-h-[520px] min-h-64 w-full object-cover"
      />;
    const copy = (
      <div className="flex flex-col justify-center">
        {content.subtitle && (
          <span className="font-mono text-[10px] uppercase tracking-[.22em] text-[#ee6a33]">
            {content.subtitle}
          </span>
        )}
        <h2 className="mt-4 max-w-xl font-display text-5xl font-bold uppercase leading-[.88] text-[#f1ece1] sm:text-7xl">
          {content.title}
        </h2>
        {content.bodyText && (
          <p className="mt-6 max-w-lg whitespace-pre-line text-sm leading-7 text-[#a8a8a2]">
            {content.bodyText}
          </p>
        )}
        {content.buttonText && (
          <a
            href={content.buttonUrl || "#shop"}
            className="mt-7 inline-flex items-center gap-2 self-start text-[10px] font-bold uppercase tracking-[.17em] text-[#ee7441] hover:text-[#ff9868]"
          >
            {content.buttonText}
            <ArrowRight size={15} />
          </a>
        )}
        {content.textBoxes.length > 0 && <TextBoxList boxes={content.textBoxes} />}
      </div>
    );

    return (
      <section id={anchor} className="mx-auto max-w-[1440px] px-5 py-20 lg:px-10 lg:py-28">
        {section.layout === "centered" ? (
          <div className="mx-auto flex max-w-3xl flex-col items-center text-center">
            {copy}
            {image}
          </div>
        ) : (
          <div className="grid gap-10 lg:grid-cols-2 lg:items-center">
            {section.layout === "image_left" && image}
            {copy}
            {section.layout === "image_right" && image}
          </div>
        )}
      </section>
    );
  }

  if (section.type === "features") {
    return (
      <section id={anchor} className="border-y border-white/10 bg-[#17191b]">
        <div className="mx-auto max-w-[1440px] px-5 py-16 lg:px-10 lg:py-20">
          <div className={section.layout === "centered" ? "text-center" : "max-w-3xl"}>
            {content.subtitle && (
              <span className="font-mono text-[10px] uppercase tracking-[.2em] text-[#ed6b35]">
                {content.subtitle}
              </span>
            )}
            <h2 className="mt-4 font-display text-5xl font-bold uppercase leading-[.88] text-[#eee9df]">
              {content.title}
            </h2>
            {content.bodyText && (
              <p className="mt-5 text-sm leading-7 text-[#aaa9a2]">{content.bodyText}</p>
            )}
          </div>
          {content.featureItems.length > 0 && (
            <div className="mt-9 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {content.featureItems.map((item) => (
                <article key={item.id} className="border border-white/10 bg-[#191b1d] p-5">
                  <h3 className="font-display text-2xl uppercase text-[#eee9df]">{item.title}</h3>
                  {item.bodyText && (
                    <p className="mt-2 text-xs leading-6 text-[#999b98]">{item.bodyText}</p>
                  )}
                </article>
              ))}
            </div>
          )}
          {content.textBoxes.length > 0 && <TextBoxList boxes={content.textBoxes} />}
          {content.buttonText && (
            <a
              href={content.buttonUrl || "#shop"}
              className="mt-8 inline-flex items-center gap-2 text-[10px] font-bold uppercase tracking-[.17em] text-[#ee7441]"
            >
              {content.buttonText}
              <ArrowRight size={15} />
            </a>
          )}
        </div>
      </section>
    );
  }

  return <CustomFormSection section={section} anchor={anchor} />;
}

function TextBoxList({ boxes }: { boxes: HomePageTextBox[] }) {
  return (
    <div className="mt-7 grid gap-3 sm:grid-cols-2">
      {boxes.map((box) => (
        <article key={box.id} className="border-l border-[#ed6228] bg-white/[.03] px-4 py-3 text-left">
          {box.title && (
            <h3 className="font-display text-xl uppercase text-[#eee9df]">{box.title}</h3>
          )}
          {box.bodyText && (
            <p className="mt-1 whitespace-pre-line text-xs leading-6 text-[#a5a6a1]">
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
  const createMessage = useCreateMessage();
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");
  const [fileName, setFileName] = useState("");
  const isPrintRequest = content.formKind === "print_request";

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

  return (
    <section id={anchor} className="mx-auto max-w-[1440px] px-5 py-20 lg:px-10 lg:py-28">
      <div
        className={`grid gap-8 ${
          section.layout === "centered"
            ? "mx-auto max-w-3xl"
            : "lg:grid-cols-[.9fr_1.1fr] lg:items-center"
        }`}
      >
        <div className={section.layout === "centered" ? "text-center" : "flex flex-col justify-center"}>
          {content.subtitle && (
            <span className="font-mono text-[10px] uppercase tracking-[.22em] text-[#ee6a33]">
              {content.subtitle}
            </span>
          )}
          <h2 className="mt-4 font-display text-5xl font-bold uppercase leading-[.88] text-[#f1ece1] sm:text-6xl">
            {content.title}
          </h2>
          {content.bodyText && (
            <p className="mt-6 whitespace-pre-line text-sm leading-7 text-[#a8a8a2]">
              {content.bodyText}
            </p>
          )}
          {content.imageUrl && (
            <img src={content.imageUrl} alt="" className="mt-6 max-h-80 w-full object-cover" />
          )}
          {content.textBoxes.length > 0 && <TextBoxList boxes={content.textBoxes} />}
        </div>
        <div className="border border-white/10 bg-[#191b1d] p-6 sm:p-9">
          {sent ? (
            <div className="flex min-h-[320px] flex-col items-start justify-center">
              <span className="grid h-11 w-11 place-items-center border border-[#ed6228] text-[#ed6228]">
                <Check size={20} />
              </span>
              <h3 className="mt-6 font-display text-4xl uppercase text-[#eee9df]">
                {isPrintRequest ? "On our bench." : "Message on its way."}
              </h3>
              <p className="mt-2 max-w-sm text-sm leading-6 text-[#999b99]">
                Thanks for the note. We’ll read it and get back to you directly.
              </p>
              <button
                onClick={() => setSent(false)}
                className="mt-7 text-[10px] font-bold uppercase tracking-widest text-[#ed7441]"
              >
                Send another
              </button>
            </div>
          ) : (
            <form onSubmit={submit} className="space-y-5">
              <div className="flex items-center justify-between border-b border-white/10 pb-4">
                <h3 className="font-display text-3xl font-bold uppercase text-[#eee9df]">
                  {isPrintRequest ? "Custom print request" : "Send a message"}
                </h3>
                {isPrintRequest ? (
                  <FileUp size={19} className="text-[#ed6228]" />
                ) : (
                  <Send size={18} className="text-[#ed6228]" />
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
                  className="w-full resize-y border border-white/10 bg-[#121416] px-3 py-3 text-sm text-[#ece8df] outline-none focus:border-[#ed6228]"
                />
              </label>
              {isPrintRequest && (
                <label className="flex cursor-pointer items-center gap-3 border border-dashed border-white/15 px-4 py-3 text-xs text-[#aaa9a2] transition hover:border-[#ed6228]">
                  <FileUp size={16} className="text-[#ed7441]" />
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
                className="flex h-12 w-full items-center justify-between bg-[#ed6228] px-4 text-[10px] font-bold uppercase tracking-[.17em] text-[#171819] transition hover:bg-[#ff7840] disabled:opacity-50"
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
