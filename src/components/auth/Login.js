import axios from 'axios'
import React, { useState } from 'react'
import toast, { LoaderIcon } from 'react-hot-toast';
import { useDispatch, useSelector } from 'react-redux';
import { Link, useNavigate } from 'react-router-dom';
import { centerBtn, loaderStyle } from '../../objects/meta';

export default function Login() {

    const navigate = useNavigate();
    const dispatch = useDispatch(); 
    const {loading} = useSelector(s => s.auth);
    const [ fields, setFields ] = useState({email:'',password:''});
    const [ error, setError ] = useState(null);

    const onchange = e => setFields({...fields, [e.target.name]:e.target.value});

    const handleLogin = async(event) => {

        event.preventDefault() 
        dispatch({ type:'LOADING' })
        try {
            axios.post(`auth/login`, fields ).then( async ({ data }) => {  
            if( data.authToken ) {

                localStorage.setItem('asmara-token', data.authToken )
                localStorage.setItem('asmara-user', JSON.stringify(data.user))

                dispatch({ type:'HANDLE_LOGIN', payload: {
                    currency: data.currency,
                    adminStatus: data.user.type==='admin',
                    uploadDB : data['db-upload'],
                    user: data.user,
                    token: data.authToken,
                    // appKey: data.appKey
                } });
                
                return navigate('/floors')

            }}).catch((er)=> {
                toast.error('Invalid credentials!') 
                setError(er.message);
                localStorage.clear()
            }).finally(() => dispatch({ type:'STOP_LOADING' }))

        } catch (error) {
            console.log(error)
            localStorage.clear()
        }

    }  

  return (
    <>
    <div className="d-flex flex-column h-100 p-3">
        <div className="d-flex flex-column flex-grow-1">
            <div className="row h-100">
                <div className="col-xxl-6">
                    <div className="row justify-content-center h-100">
                        <div className="col-lg-6 py-lg-5">
                            <div className="d-flex flex-column h-100 justify-content-center">
                                <div className="auth-logo mb-4 text-center">
                                    <Link to={"/"} className="logo-dark">
                                        <img src="/images/asmara.jpeg" height="100" alt="logo dark"/>
                                    </Link>
                                    <Link to={"/"} className="logo-light">
                                        <img src="/images/asmara.jpeg" height="100" alt="logo light"/>
                                    </Link>
                                </div>

                                <h2 className="fw-bold fs-24 text-center">Sign In</h2>

                                <p className="text-muted mt-1 mb-2 text-center">
                                    To continue to POS
                                </p>

                                <div className="mb-5">
                                    <form onSubmit={handleLogin} className="authentication-form">

                                        <div className="mb-3">
                                            <label className="form-label" for="example-email">Email</label>
                                            <input type="email" id="example-email" name="email"
                                                className="form-control bg-" placeholder="Enter your email"
                                                onChange={onchange} />
                                        </div>
                                        <div className="mb-3">
                                            <label className="form-label" for="example-password">Password</label>
                                            <input type="password" id="example-password" className="form-control" placeholder="Enter your password" name="password" onChange={onchange}/>
                                        </div>
                                        {error && <p className="text-danger text-center mb-2">{error}</p>}
                                        <div className="mb-1 text-center d-grid">
                                            <button className="btn btn-primary" type="submit" style={centerBtn}>
                                                {loading? <LoaderIcon style={loaderStyle} /> : 'Sign In'}
                                            </button>
                                        </div>

                                    </form>
                                </div>

                            </div>
                        </div>
                    </div>
                </div>

                <div className="col-xxl-6 d-none d-xxl-flex">
                    <div className="card h-100 mb-0 overflow-hidden">
                        <div className="d-flex flex-column h-100">
                            <img src={"/images/small/dining.jpg"} alt="" className="welcome-img h-100" style={{opacity:0.8}}/>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>
    </>
  )
}
