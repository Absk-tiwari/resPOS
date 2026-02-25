import React from 'react'
import Keyboard from 'react-simple-keyboard' 
import { Button } from './Button';
import { footerStyle, innerStyle, outerStyle, upperStyle } from '../../objects/keyboard/keyboardStyle';
import { lowerCase, numFields, numPad, upperCase } from '../../objects/keyboard/layouts';
import { defPosition } from '../pos/POS';

function VirtualKeyboard({
    ref,
    position = defPosition,
    change,
    fields,
    setFields,
    handleUp,
    handleMove,
    handleDown,
    scale=1,
    setScale,
    target,
    setTarget,
    layout='shift',
    setLayout,
    eraseField=false,
    updater
}) {

    const increase = () => {
        localStorage.setItem('_keyboard_scale', Math.min(JSON.parse(scale) + 0.1, 2))
        if(typeof setScale !== 'undefined' ) {
            setScale(prev => Math.min(JSON.parse(prev) + 0.1, 2))
        } else {
            scale = Math.max(scale - 0.1, 0.5)
        }
    }

    const decrease = () => {
        localStorage.setItem('_keyboard_scale', Math.max(scale - 0.1, 0.5))
        if(typeof setScale !== 'undefined' ) {
            setScale(prev => Math.max(prev - 0.1, 0.5))
        } else {
            scale = Math.max(scale - 0.1, 0.5)
        }

    }

    return (
        <div className="mt-4 position-fixed w-50" style={{ zIndex: 9999, top: 60 }}>
            <div style={upperStyle}>
                <div
                    style={{
                        ...outerStyle,
                        width: numFields.includes(target) ? 420 : 700,
                        top: `${position.y}px`,
                        left: `${position.x - 200}px`,
                        cursor: "grab",
                        transform: `scale(${scale})`
                    }}
                >
                    <div
                        onPointerMove={handleMove}
                        onPointerUp={handleUp}
                        onPointerDown={handleDown}
                        style={innerStyle}
                    >
                        <Button text={<i className="bx bx-minus"/>} onClick={decrease} />
                        {typeof handleMove !== 'undefined' && <span> Hold To Drag </span>}
                        <Button text={<i className="bx bx-plus"/>} onClick={increase} />
                    </div>
                    <Keyboard
                        onChange={change}
                        keyboardRef={r => (ref.current = r)}
                        onKeyPress={e => {
                            if (e === "{lock}" && typeof setLayout !== 'undefined') {
                                setLayout((prev) => (prev === "default" ? "shift" : "default"))
                            }
                        }}
                        layout={{
                            default: numFields.includes(target) ? numPad : lowerCase,
                            shift: numFields.includes(target) ? numPad : upperCase
                        }}
                        display={{
                            "{bksp}": numFields.includes(target) ? 'X' : 'backspace',
                            '{space}': " ",
                            '{lock}': "Caps"
                        }}
                        layoutName={layout}
                    />
                    <div className={`bg-white d-flex board-navs ${numFields.includes(target) ? 'numeric' : ''}`} style={footerStyle}>
                        <Button text={'CLEAR'}
                            onClick={() => {
                                if(typeof setLayout!== 'undefined') {
                                    setLayout('shift');
                                }
                                // setFocusedCustom('');
                                if(typeof fields === 'object') {
                                    setFields({ ...fields, [target]: '' });
                                } else {
                                    setFields('');
                                }
                                ref.current.clearInput();
                            }} />
                        <Button 
                            text={ typeof updater === 'undefined'? 'CLOSE': "DONE" }
                            btnClass={typeof updater === 'undefined'? 'light':'success'}
                            onClick={() => { 
                                setTarget('');
                                if(eraseField) {
                                    setFields(null);
                                }
                                if(typeof updater !== 'undefined') {
                                    updater()
                                }
                            }}
                        />
                    </div>
                </div>
            </div>
        </div>
    )
}

export default VirtualKeyboard