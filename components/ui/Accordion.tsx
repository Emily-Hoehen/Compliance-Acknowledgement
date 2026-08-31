import { ReactNode } from "react";
import styles from "./Accordion.module.css";

export type AccordionItemData = {
  id: string;
  header: ReactNode;
  content: ReactNode;
};

export type AccordionTheme = "dark" | "light";

export type AccordionProps = {
  items: AccordionItemData[];
  openIds: string[];
  onToggle: (id: string) => void;
  theme?: AccordionTheme;
};

/**
 * Accordion — a stack of expand/collapse sections sharing one
 * bordered shell. Which sections are open is controlled by the
 * caller (`openIds`/`onToggle`) so it can be reset, pre-opened, or
 * kept in sync with something else on the page.
 */
export function Accordion({ items, openIds, onToggle, theme = "light" }: AccordionProps) {
  return (
    <div className={styles.accordion} data-theme={theme}>
      {items.map((item) => {
        const isOpen = openIds.includes(item.id);
        return (
          <div key={item.id} className={styles.item}>
            <button type="button" className={styles.itemHeader} aria-expanded={isOpen} onClick={() => onToggle(item.id)}>
              <span className={[styles.itemCaret, isOpen ? styles.itemCaretOpen : ""].filter(Boolean).join(" ")} aria-hidden="true">
                <i className="fa-solid fa-chevron-right" aria-hidden="true" />
              </span>
              {item.header}
            </button>
            {isOpen && <div className={styles.itemContent}>{item.content}</div>}
          </div>
        );
      })}
    </div>
  );
}
