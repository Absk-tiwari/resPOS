import axios from "axios"; 
import Themeroutes from "./routes/Router";
import ShowError from './components/errors/ShowError'
import './App.css';
import './assets/scss/app.scss'
import "react-simple-keyboard/build/css/index.css";
import 'bootstrap/dist/js/bootstrap.min.js';

import { useSelector } from "react-redux";
import { useLocation, useNavigate, useRoutes } from "react-router-dom";
import { useEffect } from "react";
import { Warning } from "./helpers/utils.js";
import { useOrderEvents } from "./components/pos/OrderEvents.js";

const token = localStorage.getItem('asmara-token');
let headers;
if(token) {
    headers = {
        'Content-Type' : 'application/json',
        'asmara-token' : token
    }
} else {
    headers = { 'Content-Type' : 'application/json' }
}

axios.defaults.baseURL=process.env.REACT_APP_BACKEND_URI??'http://localhost:5101';
axios.defaults.headers.common = headers;

function App() {

    const { error, errorCode, userToken, internet, theme } = useSelector( state => state.auth )
    let navigate = useNavigate();
    let location = useLocation();
    useOrderEvents();

    useEffect(() => {

        if( userToken === null ) {
            navigate('/login')
        }

        if( localStorage.getItem('_last_location') ) {
            if(location.pathname.indexOf('/customer')=== -1) {
                let to = localStorage.getItem('_last_location');
                localStorage.removeItem('_last_location');
                navigate(to)
            }
        }
     
        const html = document.getElementsByTagName('html')[0]
        html.dataset.bsTheme = theme 
    
        return () => {}

    },[ userToken, navigate ])

    useEffect(()=> {
        if(!internet) {
            navigate('/disconnected')
        }
    },[internet, navigate])

    useEffect(() => {
        const handleError = error => Warning(error);
        window.electronAPI?.hasError(handleError);
    },[])

    
    const routing = useRoutes(Themeroutes);
    if(error) {
        if(errorCode===500) {
            return <ShowError error={error}/>
        }
    }
    return routing;
  
}

export default App;
