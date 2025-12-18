import React, { useEffect, useRef, useState } from "react";
import {
    DndContext,
    useDraggable,
    useDroppable,
    rectIntersection,
} from "@dnd-kit/core";
import { Link, useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { useCancelOrderMutation, useFinishOrderMutation, useGetTablesQuery, useInitOrderMutation, useMakeOrderMutation, useMergeTableMutation, useSplitTableMutation, useUpdateTablePositionMutation } from "../features/centerSlice";
import { useSearch } from "../contexts/SearchContext";
import { capitalFirst, Warning } from "../helpers/utils";
import { tableStat } from "../objects/meta";
import { badgeStyle, floorTile, tableContainer, tableDivStyle } from "../objects/styles";
import toast, { LoaderIcon } from "react-hot-toast";

function Table({ table, isDragging, loading }) {

    const dispatch = useDispatch();
    const [initOrder] = useInitOrderMutation();
    const [splitTable] = useSplitTableMutation();
    const [finishOrder] = useFinishOrderMutation();
    const [cancelOrder] = useCancelOrderMutation();
    const [makeOrder] = useMakeOrderMutation();

    const { cartProducts, tableOrders, theme, kitchenPrinter } = useSelector(s => s.auth);
    const { attributes, listeners, setNodeRef, transform } = useDraggable({
        id: table.id,
    });
    const { setNodeRef: setDropRef, isOver } = useDroppable({ id: table.id });
    const { setActiveSession } = useSearch();
    const [inAction, setInAction] = useState(null);

    const navigate = useNavigate();

    const ref = (node) => {
        setNodeRef(node);
        setDropRef(node);
    };

    const openPOS = async (stat, tN) => {
        setInAction(table.table_number)
        if (stat !== 'free') toast("Order is ongoing!");
        if (!tableOrders.hasOwnProperty(tN)) {
            initOrder(tN);
        }
        setActiveSession(tN);
        setInAction(() => null);
        return navigate(`/pos/${tN}`);

    }

    const splitTheTable = async (table_number) => {
        setInAction(table.table_number)
        // confirmAction(async () => {
        await splitTable({
            table_number
        }).unwrap();
        // }, "This will cancel the order if it's not complete order?");
        setInAction(() => null);
    }

    const style = {

        ...tableDivStyle,
        left: table.x,
        top: table.y,
        width: table.width,
        height: table.height,
        background: table.color,
        border: isOver ? "3px solid #0c0808ff" : "2px solid #444",
        boxShadow: isOver ? "0 0 26px rgba(40, 38, 38, 0.6)" : (theme === 'dark' ? "rgb(0 0 0) 0px 15px 24px" : "0 2px 5px rgba(0,0,0,0.2)"),
        transform: transform ? `translate(${transform.x}px, ${transform.y}px)` : "none",
        transition: transform ? "none" : "all 0.15s ease"

    };

    const pointerRef = useRef({ x: 0, y: 0 });
    const dragThreshold = 5;
    const movedRef = useRef(false);

    const cancelOngoing = async () => {
        setInAction(table.table_number)
        const order = tableOrders[table.table_number];
        const data = await cancelOrder({
            order: order.id,
            table: table.table_number
        }).unwrap();

        if (data.status) {
            dispatch({
                type: "UNSET_ORDER",
                payload: table.table_number
            });
        }
        setInAction(() => null); 
    }

    const sendToKitchen = async () => {
        setInAction(table.table_number)
        const { data } = await makeOrder({
            id: table.table_number,
            body: {
                order_id: tableOrders[table.table_number].id
            }
        });

        if (data.status) {
            toast.success(data.message);
            // sending the print in kitchen
            window.electronAPI?.sendToKitchen({
                tableName: table.table_number,
                products: (cartProducts[table.table_number] ?? []).map(p => ({name: p.name, stock: p.stock })),
                taste: tableOrders[table.table_number].taste,
                note: tableOrders[table.table_number].note,
                printer: kitchenPrinter
            });
        } else {
            toast.error(data.message)
        }
        setInAction(() => null); 
    }

    const freeTheTable = async () => {
        setInAction(table.table_number)
        const data = await finishOrder({
            order: tableOrders[table.table_number].id,
            table: table.table_number
        }).unwrap();

        if (data.status) {
            dispatch({
                type: "UNSET_ORDER",
                payload: table.table_number
            });
        }
        setInAction(() => null); 
    }

    const handlePointerDown = (e) => {

        pointerRef.current = { x: e.clientX, y: e.clientY };
        movedRef.current = false; // Call original listener so dragging still works
        listeners?.onPointerDown?.(e);

    };

    const handlePointerMove = (e) => {

        const dx = Math.abs(e.clientX - pointerRef.current.x);
        const dy = Math.abs(e.clientY - pointerRef.current.y);
        if (dx > dragThreshold || dy > dragThreshold) {
            movedRef.current = true;
        } else {
            isDragging(true);
        }

    };

    const handlePointerUp = (e) => {

        if (!movedRef.current) {

            const elem = e.target;
            if (!elem) return;

            const { type, call } = e.target.dataset;

            if (type === 'actions') {
                if (call === 'cancel') {
                    return cancelOngoing();
                }
                if (call === 'payment') {
                    return navigate(`/payment/${table.table_number}`);
                }
                if (call === 'free') {
                    return freeTheTable();
                }
                if (call === 'send-to-kitchen') {
                    return sendToKitchen();
                }
                return
            }
            if (!type) {
                console.log(table)
                return openPOS(table.status, table.table_number);
            }
            if (type === 'split') {
                return splitTheTable(table.table_number);
            }
            // openPOS(table.status, table.table_number);

        } else {
            isDragging(true);
        }

    };

    const options = e => {
        e.preventDefault();
        e.stopPropagation()
    }

    return (
        <div
            ref={ref}
            {...listeners}
            {...attributes}
            style={style}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onContextMenu={options}
            // data-status={table.status}
            className="d-block text-center"
        >
            <div className="d-block" style={{ zIndex: 9999 }} data-type="pos" onClick={(e) => {
                e.stopPropagation();
                openPOS(table.status, table.table_number);
            }}>
                <div> {table.label} </div>
                <span
                    className={`text-white btn-${table.className} mt-1 d-block`}
                >
                    {capitalFirst(table.status)}
                </span>
                {
                    tableOrders[table.table_number] && table.status !== 'free' ? (<>
                        <div className="dropdown dropend">
                            <button
                                type={'button'}
                                data-type='actions'
                                className={`btn-sm btn btn-primary mt-1`}
                                id={`dropdown-${table.table_number}`} data-bs-toggle="dropdown"
                            >
                                More...
                            </button>
                            {<div className="dropdown-menu dropdown-menu-dark" aria-labelledby={`dropdown-${table.table_number}`}>

                                {['in-kitchen', 'served'].includes(tableOrders[table.table_number].status) && tableOrders[table.table_number].payment !== 'paid' ?
                                    <span className="dropdown-item" data-call="payment" data-type="actions" > Go to Payment </span>
                                    : null}
                                {['ongoing'].includes(tableOrders[table.table_number].status) && Object.keys(tableOrders[table.table_number].data).length ?
                                    <span className="dropdown-item" data-call="send-to-kitchen" data-type="actions">Send to kitchen</span>
                                    : null
                                }
                                {Object.keys(tableOrders[table.table_number].data).length && tableOrders[table.table_number].payment === 'paid' && tableOrders[table.table_number].status !== 'completed' ?
                                    <span className="dropdown-item" data-type="actions" data-call="free" >Finish Order </span>
                                    : null}
                                {
                                    table.status === 'order ongoing' ?
                                        <span data-type="actions" data-call="cancel" className="dropdown-item">Cancel Order</span> : null
                                }

                            </div>}
                        </div>
                    </>)
                        : null
                }
            </div>

            <div className="text-center" style={{ justifySelf: 'center', }}>
                {table.table_number === inAction || loading === table.table_number ? <LoaderIcon /> : null}
            </div>

            {table.merged ?
                ['top', 'top-2', 'right', 'right-2', 'bottom', 'bottom-2', 'left', 'left-2'].map(p => <div key={p} className={`chair merged ${p}`} />) :
                ['top', 'right', 'bottom', 'left'].map(position => <div key={position} className={`chair ${position}`} />)}

            {cartProducts[table.table_number]?.length ? (
                <span
                    style={badgeStyle}
                    onClick={(e) => {
                        e.stopPropagation();
                        openPOS(table.status, table.table_number);
                    }}
                >
                    {cartProducts[table.table_number]?.length}
                </span>
            ) : null}

            {table.merged && table.status === 'free' ? <span
                data-type="split"
                onClick={(e) => {
                    e.stopPropagation();
                    toast.success("wanted to split");
                }}
                className={"btn btn-sm btn-danger mt-1"}
            >
                Split Tables
            </span> : null}
        </div>
    );

}


export default function TableFloorPlan() {

    const [tables, setTables] = useState([]);
    const [updateTablePosition] = useUpdateTablePositionMutation();
    const { data, isSuccess } = useGetTablesQuery();// !token
    const [mergeTable] = useMergeTableMutation();
    const [isDragging, setIsDragging] = useState(false);

    const [loading, setLoading] = useState(false);

    const handleDragEnd = async (event) => {

        setIsDragging(false);

        const { active, over, delta } = event;

        if (!active) return;

        const dragged = tables.find(t => t.id === active.id);

        if (!dragged) return;
        const newX = dragged.x + (delta?.x || 0);
        const newY = dragged.y + (delta?.y || 0);
        // no overlap? just move
        if ((!over || over.id === active.id)) {

            if (delta.x === 0) return;
            setTables(tables.map((t) => t.id === active.id ? { ...t, x: newX, y: newY } : t));
            // if(typeof active.id === 'string') return
            await updateTablePosition({
                table: dragged.table_number,
                body: { x: newX, y: newY }
            }).unwrap();
            return;

        }

        const target = tables.find(t => t.id === over.id);

        if (dragged.status !== 'free' || target.status !== 'free') {
            Warning("Only FREE tables can be merged!");
            return;
        }

        await updateTablePosition({
            id: dragged.id,
            body: { x: target.x, y: target.y }
        }).unwrap();

        const mergedTable = {
            id: dragged.id,
            x: target.x,
            y: target.y,
            width: dragged.width + target.width - 50,
            height: dragged.height + target.height - 90,
            color: "rgb(142, 172, 86)",
            label: `${dragged.label}+${target.table_number}`,
            table_number: dragged.table_number + "+" + target.table_number,
            status: "free",
            merged: true
        };
        
        setLoading(()=> dragged.table_number);
        await mergeTable({
            t1: dragged.table_number,
            t2: target.table_number,
            mergedTable,
            draggedId: dragged.id,
            targetId: target.id
        });
        setLoading(()=> false);

    };
    
    useEffect(() => {

        if (isSuccess) {

            let modified = [];
            let removal = [];
            for (const t of data.tables) {
                if (t.linked_to) {

                    if (removal.indexOf(t.linked_to) !== -1) continue;
                    modified.push({
                        ...t,
                        table_number: t.linked_to,
                        color: tableStat[t.status],
                        label: "Table: " + t.linked_to,
                        height: t.length + 50,
                        width: t.width + 50,
                        merged: true
                    });

                    removal = [...removal, ...t.linked_to.split('+'), t.linked_to];

                } else {

                    if (removal.indexOf(t.table_number) !== -1) continue;

                    modified.push({
                        ...t,
                        color: tableStat[t.status],
                        orders: 1,
                        label: "Table-" + t.table_number,
                        height: t.length
                    });
                }
            };

            document.body?.classList.add('no-overflow');
            setTables(() => modified);

        }

        return () => {
            document.body?.classList.remove('no-overflow')
        };

    }, [data, isSuccess]);

    return (
        <div className={`floor-tile ${isDragging ? "dragging" : ""}`}
            style={floorTile}
        >
            <DndContext collisionDetection={rectIntersection} onDragEnd={handleDragEnd}>
                <div style={tableContainer}>
                    {tables.map((table) => <Table
                        key={table.id}
                        table={table}
                        isDragging={setIsDragging}
                        loading={loading}
                        setLoading={setLoading}
                    />)}
                </div>
            </DndContext>
        </div>
    );
}
