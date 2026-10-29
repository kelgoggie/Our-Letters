export type LetterElement =
| { kind: "image"; id: string; src: string; x: number; y: number; width: number; rotation: number; z: number }
| { kind: "text"; id: string; content: string; x: number; y: number; width: number; rotation: number; z: number; fontSize: number; bold?: boolean; italic?: boolean; html?: string };
// For text, `content` is always the plain words; `html` is only set when some words are bold/italic.

export type Letter = {
    id: string;
    title: string;
    from: string;
    createdAt: string;
    elements: LetterElement[];
    draft?: boolean;   // saved but not sent yet; only the author sees it
    starred?: boolean;
};
