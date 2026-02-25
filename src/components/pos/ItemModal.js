import React, { useEffect, useState } from "react";
import labelImg from "../../assets/images/default.png";
import { dealHost } from "../../helpers/utils";
import { tastes } from "../../objects/meta";

export const ItemModal = ({ item, setItem, addToCart }) => {

    // keyboard state
    const [chosen, setChosen] = useState(tastes[0]);
    const [note, setNote] = useState("");
    const [caps, setCaps] = useState(false);
    const [keyboardOpen, setKeyboardOpen] = useState(false);
    const [qty, setQty] = useState(1);


    const pickSpicePop = (sp) => {
        
        const taste = tastes[sp];
        setChosen(()=> taste);
        setItem((item) => ({...item, taste: taste.label}));

        setNote((prev) => {
            // remove old taste if exists
            let newNote = prev;
            tastes.forEach((t) => {
                if (newNote.includes(t.emoji)) {
                    newNote = newNote.replaceAll(t.emoji, "").trim();
                }
            });
            return newNote + " " + taste.emoji;
        });

    }

    const typeChar = (char) => {
        if (note.length >= 80) return;

        if (/[a-z]/i.test(char)) {
            char = caps ? char.toUpperCase() : char.toLowerCase();
        }
        setItem((item) => ({...item, note: note + char}));
        setNote((prev) => prev + char);
    };

    const backspace = () => setNote((prev) => prev.slice(0, -1));
    const clearNote = () => setNote("");
    const toggleCaps = () => setCaps((c) => !c);

    const submit = () => {
        addToCart(item.id, item.catName, qty, note);
        setItem(null);
    };

    if (!item) return null;

    return (
        <>
            {/* BACKDROP */}
            <div
                className={`drov`}
                onClick={() => {setItem(null);}}
            />
            {/* MODAL */}
            <div className="spice-pop-bg open" onClick={()=>{setItem(null);}}>
                <div className="spice-pop" onClick={(e) => e.stopPropagation()}>
                    <div className="spice-pop-inner">
                        <div className="spice-pop-top">
                            <div className="spice-pop-dish">
                                <img
                                    className="spice-pop-img"
                                    src={dealHost(item.thumb ?? item.image ?? labelImg)}
                                    alt=""
                                />
                                <div>
                                    <div className="spice-pop-name">{item.name}</div>
                                    <div className="spice-pop-price">
                                        €{item.price * qty}
                                    </div>
                                </div>
                            </div>

                            <button
                                className="spice-pop-close"
                                onClick={() => setItem(null)}
                            >
                                ✕
                            </button>
                        </div>

                        <div className="spice-pop-label" id="spPopSpiceLabel">🌶️ Spice Level </div>
                        <div className="spice-pop-opts" id="spPopOpts">
                            {tastes.map((taste, i) => (
                                <div className={` spice-pop-opt ${tastes.indexOf(chosen) === i ? "s0" : ""}`} data-sp={i} onClick={() => pickSpicePop(i)}>
                                    <span className="spemi">{taste.emoji}</span>
                                    <span className="splbl">{taste.label}</span>
                                    <span className="spsub">{taste.sub}</span>
                                </div>
                            ))}
                        </div>
                        <div className="spice-pop-label">📝 Kitchen Note</div>

                        <div className="spice-note-row">
                            <div
                                className={`spice-pop-note ${note ? "" : "empty-note" } ${keyboardOpen ? "active" : ""}`}
                                onClick={() => setKeyboardOpen(true)}
                            >
                                { note || "Tap to type..." }
                                { keyboardOpen && <span>|</span> }
                            </div>

                            <button
                                className={`vkb-toggle ${keyboardOpen ? "on" : ""}`}
                                onClick={() => setKeyboardOpen((o) => !o)}
                            >
                                ⌨️
                            </button>
                        </div>
                    </div>

                    {/* ACTIONS */}
                    <div className="spice-pop-actions">
                        <div className="spice-pop-qty">
                            <button className="spice-pop-qb" onClick={() => setItem((item) => ({...item, stock: Math.max(1, item.stock - 1)}))}>−</button>
                            <div>{item.stock}</div>
                            <button className="spice-pop-qb" onClick={() => setItem((item) => ({...item, stock: item.stock + 1}))}>+</button>
                        </div>

                        <button className="spice-pop-add" onClick={submit}>
                            Add · €{item.price * item.stock}
                        </button>
                    </div>

                    {/* VIRTUAL KEYBOARD */}
                    {keyboardOpen && (
                        <div className="vkb open">
                            <div className="vkb-row">
                                {"1234567890".split("").map((n) => (
                                    <button key={n} className="vk num" onClick={() => typeChar(n)}>
                                        {n}
                                    </button>
                                ))}
                                <button className="vk action" onClick={backspace}>⌫</button>
                            </div>

                            <div className="vkb-row">
                                {"qwertyuiop".split("").map((l) => (
                                    <button key={l} className="vk" onClick={() => typeChar(l)}>
                                        {caps ? l.toUpperCase() : l}
                                    </button>
                                ))}
                            </div>

                            <div className="vkb-row">
                                {"asdfghjkl.,".split("").map((l) => (
                                    <button key={l} className="vk" onClick={() => typeChar(l)}>
                                        {caps ? l.toUpperCase() : l}
                                    </button>
                                ))}
                            </div>

                            <div className="vkb-row">
                                <button className="vk action wide" onClick={toggleCaps}>
                                    {caps ? "⬆ CAPS" : "⬆ Caps"}
                                </button>

                                {"zxcvbnm!".split("").map((l) => (
                                    <button key={l} className="vk" onClick={() => typeChar(l)}>
                                        {caps ? l.toUpperCase() : l}
                                    </button>
                                ))}
                            </div>

                            <div className="vkb-row">
                                <button className="vk action" onClick={() => typeChar("@")}>@</button>
                                <button className="vk action" onClick={() => typeChar("-")}>−</button>
                                <button className="vk wider" onClick={() => typeChar(" ")}>space</button>
                                <button className="vk action" onClick={clearNote}>Clear</button>
                                <button className="vk green wide" onClick={() => setKeyboardOpen(false)}>
                                    Done ✓
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </>
    );
};