import React, { useEffect, useState } from 'react'
import logo from './../../assets/images/logo.jpeg';
import webQR from './../../assets/images/web.jpg';
import gmbQR from './../../assets/images/gmb.jpg';
import { cFont, QR } from '../../objects/styles';

export default function CustomerScreen() {

    const [total, setTotal] = useState(0);
    const [table, setTable] = useState("");
    useEffect(() => {

        const handleDataReceived = (data) => { 
            if (data && data.total !== undefined) {
                setTotal(data.total ?? 0);
                setTable(data.table);
            }
        }
        window.electronAPI?.onDataReceived(handleDataReceived)

    }, []);
    
    return (
        <>
        <div className={`col-md-12 align-self-center position-relative`} >
            <div className="mt-4 gap-4 d-flex">
                <div className={`col-md-4 mt-4`} 
                    style={{
                        width: '40vw'
                    }}
                >
                    <div className='library d-grid justify-content-center align-items-center w-100 h-100' style={{placeItems:'end'}}>
                        <div style={{cssText:"width:80%!important;text-align:center"}}>
                            {table ? <div style={{border:'1px solid'}}>
                                <h3>Table No. {table}</h3>
                                <h2 className='text-center' style={{ fontSize:'3rem', fontWeight:'900', padding:'6px 0px' }}>
                                    Total is &nbsp;&nbsp;€ {parseFloat(total).toFixed(2)} 
                                </h2>
                            </div>: null}
                            <img src={logo} alt={''} style={{height:176,marginTop:10}}/>
                            <div style={{width:'100%'}}>
                                <div style={{textAlign:'center',marginTop:10}}>
                                    <div style={{textTransform:'uppercase'}}>
                                        <h3 style={{ paddingTop:10,fontWeight:650,wordSpacing:5 }}>
                                            &#x1F6D2; Grote Berg 47, 5611KH Eindhoven, Netherlands <br/>
                                            <div className="d-flex w-100" style={{justifyContent:'space-evenly'}}>
                                            &#x260E;:040-2824295
                                            {/* Mob:06-26233599 */}
                                            </div>
                                        </h3>
                                    </div>
                                    <h4 style={{fontWeight:650}}>
                                        <b>Email: info@asmara-eindhoven.nl</b>
                                    </h4>
                                    <h3 style={{textTransform:'uppercase'}}>
                                        <b>www.asmara-eindhoven.nl</b>
                                    </h3>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
                <div className='col-md-6 mt-4'>
                    <div className="row mt-4">
                        <div className="col-12 text-center">
                            <h1 style={cFont}>Thanks For Choosing
                                <br />
                                Asmara Restaurant 
                                <br />
                            </h1>
                        </div>
                        <div className="col-12 mt-4 text-center h-100 align-items-center" >
                            <div className="row">
                                <div className="col-6">
                                    <img src={webQR} alt="" style={QR}/>
                                    <h3 className='mt-2'><b>Visit our website</b></h3>
                                </div>
                                <div className="col-6">
                                    <img src={gmbQR} alt="" style={QR}/>
                                    <h3 className='mt-2'><b>Add a review</b></h3>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
        </>
    )
}
