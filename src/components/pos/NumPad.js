import React from 'react'
import { CalcButton } from './POS';
import { btnStyle } from '../../objects/styles';
import { f } from '../../helpers/utils';

export default function NumPad({
    order,
    placeOrder,
    table,
    paidStat,
    session,
    theme,
    currency,
    editing,
    setEditing,
    editingQT,
    setEditingQT,
    reset,
    changeInput,
    setQty,
    navigator,
    setCustomerModalOpen,
    customerModalOpen,
    minned,
    setMin,
    total,
}) {
    return (
        <>
            <div className="row">
                <div className="col-sm-12 d-flex">
                    <div className="col-sm-7 d-flex">
                        {f(total(false, 1)) !== f(total()) ? (<>
                            <button
                                type={'button'}
                                className={"btn btn-light btn-rounded text-white "}
                                style={{ backgroundColor: '#04537d', width: '70%', zIndex: 9999 }}
                                disabled={order?.status === 'in-kitchen' && f(total()) === order?.total}
                                onPointerUp={() => placeOrder()}
                            >
                                {order?.status === 'in-kitchen' && f(total()) === order?.total ? "In Kitchen" : 'Order'}
                            </button>
                            {
                                paidStat[table] < total() &&
                                <button
                                    type={'button'}
                                    className="btn btn-light btn-rounded text-white offset-1"
                                    style={{ backgroundColor: '#452077ff', width: '75%', zIndex: 9999 }}
                                    onPointerUp={() => navigator(session && session !== undefined ? ('/payment/' + session) : '/payment/')}
                                >
                                    Payment
                                </button>
                            }
                        </>) :
                            paidStat[table] < total() &&
                            <button
                                type={'button'}
                                className="btn btn-light btn-rounded text-white"
                                style={{ backgroundColor: '#452077ff', width: '75%', zIndex: 9999 }}
                                onPointerUp={() => navigator(session && session !== undefined ? ('/payment/' + session) : '/payment/')}
                            >
                                Payment
                            </button>
                        }
                        <span
                            className={`fs-1 ms-2 bx bx-chevron-${minned ? 'up' : "down"} ${theme === 'dark' ? "text-white" : "text-dark"}`}
                            onClick={() => setMin(!minned)}
                        />
                    </div>
                    <div className="col-sm-5 d-flex justify-content-end align-items-center position-relative">
                        <div className={'position-absolute'}>
                            <p style={{ lineHeight: 2.1, whiteSpace: 'nowrap' }}>
                                <b> Pay: &nbsp;
                                    <span className="total-amount" style={{ left: 0, fontSize: '2.3rem' }}>
                                        {(currency + f(total() - (paidStat[table] || 0))).replace(" ", '')}
                                        {paidStat[table] ? (
                                            <>
                                                <small>&nbsp;paid:</small>
                                                <div style={{ display: 'inline' }}>
                                                    <b className='text-success fs-3'>{f(paidStat[table])}</b>
                                                </div>
                                            </>
                                        ) : ""}
                                    </span>
                                </b>
                            </p>
                        </div>
                    </div>
                </div>
            </div>
            <div className={`div indicator ${minned ? 'd-none' : ''}`}>
                <div className="row mt-1">
                    {[1, 2, 3].map(it => <CalcButton key={it} onClick={e => changeInput(it, e)} disabled={!editing && !editingQT} style={btnStyle} text={it} />)}
                    <div className="col-sm-3 calc" onClick={reset}>
                        <button className={`btn btn-dark num w-100`} type="button" style={{ ...btnStyle, padding: 5 }}> Clear Items </button>
                    </div>
                </div>
                <div className="row mt-1">
                    {[4, 5, 6].map(it => <CalcButton key={it} disabled={!editing && !editingQT} style={btnStyle} text={it} onClick={e => changeInput(it, e)} />)}
                    <div className="col-sm-3" />
                </div>
                <div className="row mt-1">
                    {[7, 8, 9].map(ite => <CalcButton key={ite} disabled={!editing && !editingQT} style={btnStyle} text={ite} onClick={(e) => changeInput(ite, e)} />)}
                    <div className="col-sm-3 calc" onClick={() => {
                        if (editingQT === true) {
                            setQty('')
                        }
                        setEditing(false);
                        setEditingQT(!editingQT);
                    }}>
                        <button className={`btn btn-dark text-white num w-100`} style={{ ...btnStyle, padding: 10, height: 46 }}>
                            <b className='num'>{!editingQT ? 'Edit Qty' : 'Done'}</b>
                        </button>
                    </div>
                </div>
                <div className="row mt-1">
                    <div className="col-sm-3 calc">
                        <button className="btn btn-light num w-100 text-white" onClick={() => setCustomerModalOpen(!customerModalOpen)} style={{ ...btnStyle, background: "#891d89" }}> <b> Customer </b> </button>
                    </div>
                    <div className="col-sm-3 calc">
                        <button className={`btn btn-dark num w-100 text-white`} disabled={!editing && !editingQT} onClick={e => changeInput(0, e)} style={btnStyle}> <b> 0 </b> </button>
                    </div>
                    <div className="col-sm-3 calc">
                        <button className={`btn btn-dark num w-100 text-white`} disabled={!editing && !editingQT} onClick={e => changeInput('clear', e)} style={{ ...btnStyle, padding: '15px 10px' }}> <b>Reset</b> </button>
                    </div>
                    <div className="col-sm-3 calc" onClick={(e) => {
                        setEditingQT(false)
                        setEditing(!editing)
                    }}>
                        <button className={`btn btn-dark num w-100`} style={{ ...btnStyle, padding: '5px 0px', height: 46 }}>
                            {!editing ? 'Edit Price' : 'Done'}
                        </button>
                    </div>
                </div>
            </div>
        </>
    )
}
