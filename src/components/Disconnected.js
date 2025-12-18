import axios from 'axios'
import React, { useEffect } from 'react'
import toast from 'react-hot-toast'
import { useDispatch, useSelector } from 'react-redux'
import { useNavigate } from 'react-router-dom'

export default function Disconnected() {
    const {internet} = useSelector(s => s.auth)
    const navigate = useNavigate()
    const dispatch = useDispatch()
    const checkInternet = async () => {
        try {
            const {data} = await axios('/check-connection')
            if(data.status) {
                dispatch({type:"CONNECTED"})
            }
            
        } catch (error) {
            toast.error("Internet unavailable!")
        }
    }

    useEffect(()=> {
        if(internet) {
            navigate('/dashboard')
        }
    }, [internet])

    return (
    <div className='w-100 d-grid h-100' style={{placeContent:'center', alignContent:'center'}}>
        <h3>Internet is unavailable</h3>
        <button onClick={checkInternet} className='btn btn-rounded btn-success'>Retry</button>
    </div>
    )
}

