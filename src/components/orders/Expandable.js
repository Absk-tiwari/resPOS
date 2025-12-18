import React from "react";
import { goToPOS } from './../../objects/meta'
import { useNavigate } from "react-router-dom";

export default function ExpandedTable({ data, onExpand }) {

    const navigate = useNavigate();
    // onExpand(data.id, data.tables)
    let orders = data.items; // from your tableOrders / cartProducts
    console.log(orders);
    //  price already has quantity * unit-price
    const totalAmount = orders.reduce(
        (sum, p) => sum + Number(p.price),
        0
    );

    return (
        <div style={{ padding: 15 }}>
        <h4 style={{ marginBottom: 10 }}>
            Table {data.tables} — Order {data.status.toUpperCase()}
        </h4>

        {orders.length === 0 ? (
            <p style={{ fontStyle: "italic", color: "#666" }}>No items ordered yet.</p>
        ) : (
            <>
            <table style={{ width: "100%", borderCollapse: "collapse" }} className="table ">
                <thead>
                    <tr style={{ background: "#fafafa" }}>
                    <th style={cell}>Item</th>
                    <th style={cell}>Qty</th>
                    <th style={cell}>Price</th>
                    <th style={cell}>Subtotal</th>
                    </tr>
                </thead>
                <tbody>
                    {orders.map((item, index) => (
                    <tr key={index} style={{ borderBottom: "1px solid #eee" }}>
                        <td style={cell}>{item.sq+ ". "+item.name}</td>
                        <td style={cell}>{item.quantity}</td>
                        <td style={cell}>€{(item.price / item.quantity).toFixed(2)}</td>
                        <td style={cell}>€{item.price}</td>
                    </tr>
                    ))}
                </tbody>
            </table>
            {data.note && 
                (<div className="row mt-2 container">
                    <div className="col-12">
                        <h3>Notes:</h3>
                        {data.note}
                    </div>
                </div>)
            }
            </>
        )}

        <div style={{ textAlign: "right", marginTop: 15, justifyContent:'space-between' }} className="d-flex">
            {(data.status !== 'completed') && 
            <button
                onPointerUp={() => navigate(`/pos/${data.tables}`)}
                style={goToPOS}
                className="btn btn-success"
            >
                Go to POS
            </button>}
            <strong> Total: € {totalAmount.toFixed(2)}</strong>
        </div>

        </div>
    );
}

const cell = {
  padding: "6px 10px",
  fontSize: "14px",
};
