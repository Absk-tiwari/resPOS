
let userToken = localStorage.getItem('asmara-token') ?? null
const myInfo = JSON.parse(localStorage.getItem('asmara-user')??'{}')
const cartProducts = JSON.parse(localStorage.getItem('cartProducts')??'{"1":[]}');
let openingCash = {};
const cashAmount = Object.keys(openingCash).length? parseFloat((openingCash.opening_cash).replace('€ ','')): 0;
const tableOrders = JSON.parse(localStorage.getItem('tableOrders')??'{}');
const reservations = JSON.parse(localStorage.getItem('asmara_reservations')?? '{}');

const initialState = {

    theme: localStorage.getItem('_asmara_theme')??'default',
    kitchenPrinter: localStorage.getItem('__asmara_kitchen_printer')??'',
    reservations,
    tableOrders,
    internet:true,
    loading:false,
    update:false,
    myInfo,
    userToken,
    error: null,
    errorCode:null,
    success: false, 
    currency: '€ ', 
	search:'',  
    openingCash,
    cartProducts,
    cashAmount,
    categories: JSON.parse(localStorage.getItem('_cats') ?? '{}'),
    hasKeyboard: JSON.parse(localStorage._has_keyboard ?? 'false'),
    settings: JSON.parse(localStorage._pos_asmara_settings ?? '{}')

}

const authReducer = (state=initialState,action) => {
    switch(action.type){

        case "SET_RESERVATIONS" : {
            localStorage.setItem('asmara_reservations', action.payload);
            return {
                ...state,
                reservations: action.payload
            }
        }
        
        case "KITCHEN_PRINTER": {
            localStorage.__asmara_kitchen_printer = action.payload;
            return {
                ...state,
                kitchenPrinter: action.payload
            }
        }
        
        case "THEME": {
            localStorage._asmara_theme = action.payload;
            return {
                ...state,
                theme: action.payload
            }
        }
       
        case 'SET_TOKEN':  
            return {
                ...state,
                loading:false,
                userToken:action.payload
            }
       
        case 'LOGOUT':

            let fresh = {1:[]}
            localStorage.setItem('cartProducts', JSON.stringify(fresh));

            return {
                ...state,
                myInfo:null,
                cartProducts:fresh,
                userToken:null,
                loading:false,
            }
        
        case 'NOT_CONNECTED' : 
            return {
                ...state,
                internet:false
            }
            
        case 'CONNECTED': 
            return {
                ...state,
                internet:true
            }

        case 'LOADING': 
            return {
                ...state,
                loading:true
            } 

        case 'STOP_LOADING':
            return {
                ...state,
                loading:false
            } 
		
		case 'SEARCH':
			return {
				...state,
				search:action.payload
			}
            
        case 'ERROR':{
            return {
                ...state,
                error:action.payload.error,
                errorCode:action.payload.code
            }
        }

        case 'CHOOSEN_PRODUCT':

            localStorage.setItem('cartProducts', JSON.stringify(action.payload??[]));

            return {
                ...state,
                cartProducts:action.payload,
            } 

        case "APPEND_CART": {

            let {table, products} = action.payload;
            const cState = {...state.cartProducts};
            cState[table] = products;
            localStorage.setItem('cartProducts', JSON.stringify(cState));

            return {
                ...state,
                cartProducts: cState
            }
        }

        case "SET_CASH" : {
            localStorage.openingCash = JSON.stringify(action.payload);
            return {
                ...state,
                openingCash:action.payload
            }
        }

        case "RESET_KART": {

            let fresh = {1:[]}
            localStorage.cartProducts = JSON.stringify(fresh);
            return {
                ...state,
                cartProducts:fresh
            } 
        }

        case "DAY_CLOSE" : {
            localStorage.setItem('openingCash', '{}');
            localStorage.setItem('cartSessions','[1]');
            localStorage.__lastSession = openingCash.id;
            return {
                ...state,
                openingCash:{}
            }
        }
 
        case "SETTINGS" : {
            const setts = {}
            action.payload.forEach( set => {
                setts[set.key] = set.value
            })
            localStorage.setItem("_pos_asmara_settings", JSON.stringify(setts))
            return {
                ...state, 
                settings: setts
            };
        }

        default : return state

        case "CATEGORIES" : {
            let obj = {}
            action.payload.forEach( i => {
                // if((i.name).toLowerCase().indexOf('veg')!==-1) {
                // }
                obj[i.id] = i.name
            })
            localStorage.setItem('_cats', JSON.stringify(obj))
            return {
                ...state,
                categories: obj 
            }
        }

        case "KEYBOARD": {
            localStorage.setItem("_has_keyboard", action.payload)
            return {
                ...state, 
                hasKeyboard: action.payload
            }
        }

        case "HANDLE_LOGIN" : {

            const { appKey, adminStatus, currency, user, uploadDB, token } = action.payload

            localStorage.uploadDB = uploadDB;
            localStorage._pos_app_key = appKey;
            localStorage.currency = currency;
            localStorage.setItem('asmara-user', JSON.stringify(user));
            localStorage.setItem('asmara-token', token);

            return {
                ...state,
                appKey,
                currency,
                uploadDB,
                isAdmin: adminStatus,
                myInfo : user,
                userToken: token
            }

        }

        case "TABLE_ORDERS_BULK" : {
            localStorage.setItem('tableOrders', JSON.stringify(action.payload));
            return {
                ...state,
                tableOrders: action.payload
            }
        }

        case "ORDERS_AND_TABLE" : {

            const order = action.payload;
            const cState = {...state.tableOrders};
            const key = order.tables ?? "";
            cState[key] = {
                id:order.id,
                status: order.status,
                payment: order.payment_status,
                data: JSON.parse(order?.data??'{}'),
                taste: order?.taste?? null,
                total: order?.total?? 0.00
            };
            localStorage.setItem('tableOrders', JSON.stringify(cState));

            return {
                ...state,
                tableOrders: cState
            }

        }

        case "KEEP_ORDER" : {

            let links = {};
            action.payload.forEach( ord => {
                links[ord.id] = ord.session;
            });
            
            return {
                ...state,
                orderSession: links
            }

        }

        case "UNSET_ORDER" : {

            const { [action.payload]: removed, ...rest } = state.tableOrders;
            const { [action.payload]: removedSession, ...restSession } = state.cartProducts;

            localStorage.setItem('tableOrders', JSON.stringify(rest));
            localStorage.setItem('cartProducts', JSON.stringify(restSession));

            return {
                ...state,
                tableOrders: rest,
                cartProducts: restSession
            };
            
        }

    }
}

export { authReducer }