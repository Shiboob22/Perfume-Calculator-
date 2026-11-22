import React from "react";
import { COLORS } from "../../lib/theme";
import { IconPlus } from "../icons";

// One section of a batch's page in the Journal. On phones (`fold`) it is
// closed under its title, the home page's FAQ fold (audit H5); wide screens
// show the title and the section open.
export default function JournalSection({ name, id, title, fold, className = "mt-7", style, children }) {
  const data = { [`data-${name}`]: "" };
  const heading = <h3 id={id} className="font-serif text-xl">{title}</h3>;
  return (
    <section {...data} aria-labelledby={id} className={className} style={style}>
      {fold ? (
        <details data-fold className="group">
          <summary className="cursor-pointer list-none flex items-center justify-between gap-4 min-h-[48px]">
            {heading}
            <span aria-hidden="true" className="inline-flex items-center justify-center w-9 h-9 shrink-0 group-open:rotate-45 fill-anim" style={{ border: `1px solid ${COLORS.ink}` }}>
              <IconPlus size={18} />
            </span>
          </summary>
          {children}
        </details>
      ) : <>{heading}{children}</>}
    </section>
  );
}
