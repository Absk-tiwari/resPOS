import React from 'react'
import { chosenStyle, labelStyle } from '../../objects/styles'
import { f } from '../../helpers/utils';
import { LoaderIcon } from 'react-hot-toast';

export const Address = () => {
  return (
    <div style={{textAlign:'center'}}>
        <h5 style={{ paddingTop:0, fontWeight:650, textTransform:'uppercase' }}>
            <br/>
            &#x1F6D2; Grote Berg 47, 5611KH Eindhoven, Netherlands <br/>
            &#x260E; 040-7850081 <br/>
            www.asmara-eindhoven.nl
        </h5>
    </div>
  )
}

export const TaxTable = ({taxes}) => {

    if(!taxes) return null
    return (
        <table className='table tax-table-receipt' style={{width:'100%'}}>
            <thead className='tax-table'>
                <tr>
                    <th><span style={{fontSize:'1rem'}}> BTW </span></th>
                    <th><span style={{fontSize:'1rem'}}> OVER </span></th>
                    <th className='text-end'><span style={{fontSize:'1rem'}}> EUR </span></th>
                </tr>
            </thead>
            <tbody>
                {taxes.map((ord, ind) => <tr key={ind}>
                    <td>{ord.tax? ord.tax + '%': '0%'}</td>
                    <td>{ord.over? f(ord.over - ord.amount) :'0.00'}</td>
                    <td className={'text-end'}>€ {f(ord.amount)}</td>
                </tr>)}
            </tbody>
        </table>
    );

}

const Transaction = ({ isLoading, orderProducts, taxes, order, total }) => {

    const currency = '€ ';
    const proper = (stock, unit) => {
        if( typeof stock==='string' && unit && ([0,1].includes(stock.indexOf('.')) && (stock[0]==='0' || stock[0]==='.'))) {
            stock = stock * 1000
            if(unit && unit==='kg') {
                unit = stock > 1000 ? unit: 'gm'
            } else if(unit) {
                unit = stock > 1000 ? unit: 'mg'
            }
        }
        if(unit!=='gm') {
            stock = parseFloat(stock).toFixed(2)
        }
        return stock + (unit? ` ${unit}`: '');
    }

    const showQT = (products) => {
        let total=0
        products.forEach( k => {
            let {stock, price} = k;
            if(price > 0) {
                total+= Math.ceil(Number(stock))
            }
        })
        return total
    }
    if(isLoading) return <LoaderIcon/>;
    
    return (
        <>
            {orderProducts.map( (order,i) => <div key={i} className='row' style={chosenStyle}>
                <div style={{display:'flex', width:'100%',justifyContent:'space-between'}}>
                    <div>
                        <strong className='toShow' style={{
                            fontSize:order.name.length > 35?'medium':'large',
                            fontWeight:900,
                            fontFamily:'Manrope, sans-serif',
                            marginRight:6
                        }}>
                            { order.stock + ' '+ (order.units[order.id]??'') } x
                        </strong>
                        <b style={{fontSize:order.name.length > 35?'medium':'large',fontWeight:900,maxWidth:'80%'}}>
                            {order.name}
                        </b>
                        { order.prices[order.id] < 0 ?
                        (<><small className='toHide' style={labelStyle}>-</small></>): null }
                    </div>
                    <strong style={{whiteSpace:'nowrap'}} >
                        { order.prices[order.id] > 0 ? currency + f(order.prices[order.id]): `- ${currency}`+ Math.abs(f(order.prices[order.id]))} 
                    </strong>
                </div>
                <div className={'toHide'} style={{display:'flex',width:'100%',justifyContent:'space-between'}}>
                    <p style={{fontSize:'large',fontWeight:900,marginTop:'0.5rem'}}>
                        { currency +' '+ Math.abs(parseFloat(order.prices[order.id] / order.stock).toFixed(2)) }
                        { typeof order.id ==='string' && order.id.indexOf('quick') !== -1 ? ' x': ( order.units[order.id] ? `/ ${order.units[order.id]}` : '/ Units')}
                    </p>
                    <p style={{fontSize:'medium',fontWeight:900,marginTop:'0.5rem'}}>
                        Qty: {order.isVeg? proper(JSON.stringify(order.stock), order.units[order.id]) :f(order.stock)}
                    </p>
                </div>
            </div> )}
            <div className='desc row' style={{textAlign:'right', justifyContent:'right'}}>
                <div style={{lineHeight:1,marginTop:10}}> 
                    <span style={{ fontSize:"1.3rem", fontWeight:600, marginTop:5 }} className='total-cost'> 
                        TOTAL &nbsp; {currency + ' ' + f(total) }
                    </span>
                    <div style={{ fontSize:"1rem",fontWeight:600 }} data-order={JSON.stringify(order)} >
                        {order.modes ? Object.keys(order.modes).map( (m,i) => {
                            if(order.modes[m] && m!=='Cash') {
                                return <div key={i} style={{ fontSize:"1rem",fontWeight:600 }}>
                                    {(m === 'ogCash'? 'Cash': m)+': '+ currency +' '+ f(order.modes[m])}
                                </div>
                            }
                            return null;
                        }): 
                        order.payment_mode?.toString()?.replace(',','+')+`: ${currency} `+ f(Number(total) + Number(order.r? order.r.replace(/^\D+/g, ''):0)) }
                    </div>
                    {order.r && (<> <div style={{ fontSize:"1rem",fontWeight:600}}>{order.r}</div> </>)}
                    <div style={{fontSize:"1rem",fontWeight:600}}> Products: {showQT(orderProducts)}</div>
                </div>
                
            </div>
            <div className="row">
                <TaxTable taxes={taxes}/>
            </div>
        </>
    )
}

export default Transaction