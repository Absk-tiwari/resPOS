import { memo, useEffect, useRef, useState } from 'react'; 
import axios from 'axios';
import { useDispatch, useSelector } from 'react-redux';
import CreatableSelect from 'react-select/creatable'
import { useGetMenusQuery, useGetPosItemsQuery, commonApiSlice, useGetTaxesQuery, useGetCustomersQuery, useMakeOrderMutation } from '../../features/centerSlice';
import { chunk, Warning, f, getClientY, getClientX, Random } from '../../helpers/utils';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { useSearch } from '../../contexts/SearchContext';
import { Modal, ModalHeader, ModalBody, ModalFooter, Row, Label, Input, FormGroup, Col, Form } from 'reactstrap';
import toast from 'react-hot-toast';
import Keyboard from 'react-simple-keyboard' 
import Menu from './Menu.js';
import Items from './Items.js';
import logo from './../../assets/images/logo.jpeg';
import { footerStyle, innerStyle, outerStyle, upperStyle } from '../../objects/keyboard/keyboardStyle';
import { lowerCase, numeric0, numPad, upperCase } from '../../objects/keyboard/layouts';
import { Button } from '../layouts/Button';
import { basePOS, cFont, QR } from '../../objects/styles';

const CalcButton = ({onClick=()=>{}, disabled, text, style}) => {
    return <div className="col-sm-3 calc" onClick={onClick}>
            <button className={`btn btn-dark num w-100 text-white`} 
                disabled={disabled} 
                style={style}
            > 
            <b> {text} </b> 
        </button>
    </div>
}

export const defPosition = {
    x: window.screen.availWidth / 2.9,
    y: window.screen.availHeight / 2
}

function POS() {

    const [ activated, setCounter ] = useState(0);

    const cRef = useRef(null);
    const sectionRef = useRef(null);
    const keyboardRef = useRef();
    const ckeyboardRef = useRef();
    const dispatch = useDispatch();
    const location = useLocation();
    const navigator = useNavigate();
    let { table:activeSession } = useParams();
    if( activeSession === undefined ) {
        activeSession = "";
    }
    const chunkSize = 4 //window.screen.availWidth < 1200? 3 : 4;

    const { 
        currency, 
        split, 
        cartStocks, 
        cartProducts, 
        openingCash, 
        inventory, 
        theme, 
        hasKeyboard, 
        tableOrders,
        kitchenPrinter
    } = useSelector( s => s.auth );

    const [ makeOrder ] = useMakeOrderMutation(); 
    const [ order, setOrder ] = useState(tableOrders[activeSession??""]?
        {...tableOrders[activeSession??""], products: tableOrders[activeSession??""].data?.products }
        :{}
    );

    const placeOrder = async() => {

        const total = f(showTotal());
        const sessionData = KartProducts[activeSession].reduce(
            (acc, { stock, id, price,  ...rest }) => {
                if( acc.products.indexOf(id) ===-1 ) { // quick hi ayega udhr se hmesa so its all done here
                    acc.products.push(id)
                }
                acc.quantity[id] = ((acc.quantity[id] || 0) - 0) + (stock-0);  // Increment quantity
                acc.total = total; // Accumulate total price
                acc.price[id] = rest.return ? - (acc.quantity[id] || 0) * f(price) : (acc.quantity[id] || 0) * f(price)
                return acc;
            },
            { products: [], total: 0, quantity: {}, price:{} }
        );

        const data = await makeOrder({
            id: activeSession, 
            body: {
                order_id:tableOrders[activeSession??""]?.id,
                data:sessionData,
                total,
            }
        }).unwrap();

        setOrder(()=> ({ 
            id:data.order.id,
            status: data.order.status, 
            data: JSON.parse(data.order?.data??'{}'),
            total: data.order.total?? 0.00,
            products: JSON.parse(data.order.data??'{products:[]}').products
        }));

        if(data.status) {
            dispatch({
                type: "ORDERS_AND_TABLE",
                payload : data.order
            });
            toast.success(data.message);
            // send print to kitchen
            window.electronAPI?.sendToKitchen({
                tableName: activeSession,
                taste: tableOrders[activeSession].taste??'',
                note: tableOrders[activeSession].note??'',
                products: (KartProducts[activeSession]??[]).map(p => ({name: p.name, stock: p.stock})),
                printer: kitchenPrinter
            });

        }

    }

    const [ openingAmountSet, setOpeningAmount ] = useState(openingCash);
    
    const [ enteredCash , setEnteredCash ] = useState('');
    
    const { data, isSuccess } = useGetMenusQuery();
    const allProducts = useGetPosItemsQuery();
    const { data:dbtaxes, isSuccess:taxLoaded } = useGetTaxesQuery();
    const { data:dbCustomers } = useGetCustomersQuery();

    const [ customers, setCustomers ] = useState([]);
    const [ products, setProducts ] = useState([]);
    const [ catColors, putCats ] = useState({});
    const [ noProduct, setNoProduct ] = useState(false);
    const [ prCategories, setCategories ] = useState([]);
    const [ initialProducts, setInitialProducts ] = useState([]);
    
    const [ KartProducts, setCartProducts ] = useState(cartProducts);
    const { searchQuery, displayImage, sale } = useSearch();

    const [ currentProduct, setCurrent ] = useState(KartProducts[activeSession]?.length - 1)
    const [ Other, toggleOther ] = useState(false)
    const [ otherOpen, setModal ] = useState(false)
    const [ availableStocks, setAvailableStocks ] = useState(cartStocks);
    const [ barcode, setBarcode ] = useState('');
    const [ number, setNumber ] = useState('');
    const [ qty, setQty ] = useState('');
    const [ editing, setEditing ] = useState(false);
    const [ editingQT, setEditingQT ] = useState(false);
    const [ custom, setCustom] = useState({ image:null, price:'', name:'', barcode:'', stock:5000 });
    // for v-keyboard
    const [ focused, setFocused] = useState('');
    const [ focusedCustom, setFocusedCustom] = useState('');
    const [ focusedVeg, setFocusedVeg] = useState('');
    const [ options, setOptions ] = useState([])

    const fillCustom = e => {
        const included = /^(?:price|barcode|stock|name)$/;
        if(included.test(focusedCustom)) {
            setCustom({...custom, [focusedCustom]: focusedCustom==='price'? formatAmount(e): e});
        }
        if(focusedCustom!== 'price' && focusedCustom!== 'stock') setLayout(e.length === 0 ? "shift": "default")
    }   

    const [minned, setMin] = useState(false);
    
    const addVeg = e => {
        e.preventDefault()
        addToCart(vegetable.id)
        setFocusedVeg(false)
    }

    const [ addingCustomer, setAddingCustomer ] = useState(false);
    const [ details, setCustomerDetail ] = useState({})

    const handleCustomer = e => setCustomerDetail({...details, [e.target.name]: e.target.value })

    const addCustomer = async e => {
        e.preventDefault();
        const {data} = await axios.post(`/pos/create-customer`, details) 
        if(data.status) {
            setCustomers(data.customers)
            return toast.success(data.message)
        }
        toast(data.message);
    }
    
    const [ customerModalOpen, setCustomerModalOpen ] = useState(false);

    const selectCustomer = customer => {
        setCustomers( c => c.map( cus => cus.id === customer.id ? {...cus, selected:true} : {...cus, selected:false}))
    }

    const fillVeg = e => setVegetable({...vegetable, price: formatAmount(e)});

    const formatAmount = (cents) => (cents / 100).toFixed(2).padStart(4, "0");

    const reduceQt = index => {

        const copy = JSON.parse(JSON.stringify(KartProducts));
        let product = copy[activeSession][index];
        if( product.stock === 1 ) {
            let rest = {...KartProducts,[activeSession]: KartProducts[activeSession].filter((item, i)=> i!== index) }
            return setCartProducts(rest);
        }
        
        product.stock = product.stock - 1;
        setCartProducts(copy)
        dispatch({ type:"CHOOSEN_PRODUCT", payload: copy })
        if(window.electronAPI) {
            window.electronAPI.reloadWindow({...copy, id: product.id})
        }
    }

    const increaseQt = index => {

        let copy = JSON.parse(JSON.stringify(KartProducts));
        let product = copy[activeSession][index];
        if(inventory){ // sale
            let canAdd= product.quantity - availableStocks[product.id]
            canAdd = canAdd < 1 ? canAdd : 1;
            let updatedStock = (product.stock-0) + canAdd;
            let availableStock = product.quantity - updatedStock;
            setAvailableStocks({...availableStocks, [product.id]: availableStock });
        }
        product.stock = Number(product.stock) + 1;
        setCartProducts(copy);
        dispatch({ type:"CHOOSEN_PRODUCT", payload: copy });
        if(window.electronAPI) {
            window.electronAPI.reloadWindow({...copy, id: product.id});
        }

    }

    const [ position, setPosition ] = useState(defPosition);
    const [ dragging, setDragging ] = useState(false);
    const [ offset, setOffset ] = useState({ x: 0, y: 0 });
    const [ layout, setLayout ] = useState('shift');

    const handleMouseDown = (e) => {
        setDragging(true);
        const x = getClientX(e)
        const y = getClientY(e);
        setOffset({
            x: x - position.x,
            y: y - position.y,
        });
    };

    const handleMouseMove = (e) => {
        if (!dragging) return;
        const x = getClientX(e);
        const y = getClientY(e);
        setPosition({
            x: x - offset.x,
            y: y - offset.y,
        });
    }

    const handleMouseUp = () => setDragging(false);
    // end for v-keyboard
    const btnStyle = {minHeight:60, fontSize:'1rem'}
    
    useEffect(() => {
        let inputBuffer = "";
        const handleKeyDown = event => {
            const { key } = event;
            const activeElement = document.activeElement;
            if (activeElement && (activeElement.tagName === "INPUT" || activeElement.tagName === "TEXTAREA")) {
                return; // Do nothing if an input field is focused
            }
            if (key === "Enter") {
                event.preventDefault();
                setBarcode(inputBuffer);inputBuffer=""; 
            } else {
                if (key.length === 1) {
                    inputBuffer += key;
                }
            }
        };
        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown)

    }, [barcode]);

    useEffect(()=> {
        const handleClick = event => {
            if(!event.target.classList.contains('num') && !event.target.classList.contains('calc')) {
                setNumber('');
                setQty('')
                setEditing(false);
                setEditingQT(false);
            }
        }
        document.addEventListener('click', handleClick);
        return () => document.removeEventListener('click', handleClick)
    },[])

    useEffect(() => {
        if(allProducts.data?.products){
            setProducts(chunk(allProducts.data.products??[].filter(ite => (ite.name).toLowerCase().includes(searchQuery.toLowerCase())), chunkSize))
        }
        return () => setProducts([]);
    },[searchQuery])

    useEffect(()=> {
        if(dbCustomers){
            setCustomers(dbCustomers);
        }
    },[dbCustomers])

    
    const scrollTop = e => window.scrollTo(0,0)

    const [vegetable, setVegetable] = useState(null)

    const addToCart = (prID, cat=null) => 
    {
        if(tableOrders.hasOwnProperty(table)) {
            // return Warning("Already an order going on")
            // toast("Preparing for order...");
            // const {data} = await axios.get(`/orders/init/${tN}`);
            // console.log(data);
            // dispatch({
            //     type: "ORDERS_AND_TABLE",
            //     payload : data.order
            // });
        }

        setEditingQT(false); setQty(''); // 0 the chances of opened v-keyboard
        let product = initialProducts.find(ite => ite.id === prID);
        if(!product) return toast("Product not found with ID: "+ prID)

        if(!cat && cat!== 'null') {
            cat = product.catName
        }
        const included = /^(?:Fresh|Topop Voucher|Habesha|Vegetables|Vegetable|Green Vegetables|Paneer)$/i;
        //( if it has category & it's between regex then ) + should not be
        if( cat && included.test(cat.trim())) {
            // ,'sweets','fruits'
            if(!vegetable) {

                if(inventory && (availableStocks[product.id] === 0 || parseInt(product.quantity) === 0)) return;
                // only return if both meet with inventory off (correction);
                product = {...product, stock:'1', price: '0.00'};
                if(!sale) { // prepare it for return if return mode is onn;
                    product = {...product, return: true };
                }
                return setVegetable(product);

            }

        }
        
        const copyKartProducts = JSON.parse(JSON.stringify(KartProducts));
        let thisProduct = copyKartProducts[activeSession]?.find(ite => ite.id === prID);
        // check if the product is already in cart;
        // new check added it should not be vegetable
        if( thisProduct && !split && !included.test(cat.trim()) ) {

            let canAdd= thisProduct.quantity - availableStocks[prID];
            canAdd = canAdd < 1 ? canAdd : 1;
            let updatedStock = (thisProduct.stock-0) + canAdd;
            let availableStock = product.quantity - updatedStock;

            if(inventory && sale && availableStock < 0 ) {
                return document.querySelector('.also[data-id="'+product.id+'"]').classList.add('stock-out');
            }

            let currentIndex;
            if(!split) {  // update the current project highlight;
                currentIndex = KartProducts[activeSession].findIndex(item => item.id === product.id)
            } else { // update the current project highlight if splittin products is off;
                currentIndex = KartProducts[activeSession]?.length?? 0;
            }
            setCurrent(currentIndex)
            // update the remaining stock each product
            if(inventory && sale) setAvailableStocks({...availableStocks, [product.id]: availableStock });
            thisProduct.stock = updatedStock;
            if(!sale) { // if its not for sale then it is in return process
                thisProduct.return = true;
            }

            setCartProducts(copyKartProducts);
            dispatch({ type: "CHOOSEN_PRODUCT", payload:copyKartProducts });
            window.electronAPI?.reloadWindow({...copyKartProducts, id: thisProduct.id })

        } else {

            setCurrent(KartProducts[activeSession]?.length??0 );
            if(vegetable) { // if something inside the vegetable its the full thing
                product = {...vegetable, stock: 1 }  // (internally consists the updated value thru modal)
            } else {
                product = {...product, stock: 1 }  // adds a single item on each click
            }
            // ok so changing the value of thisProduct would indirectly change the CartData holding variable
            
            let consumed = Object.values(KartProducts).flat()?.filter( item => item.id === product.id).reduce( (prev, item) => prev + item.stock, 0 )?? 0;

            let availableStock = product.quantity - ( consumed + 1 );
            if(inventory && sale && availableStock === -1 ) { // when the quantity was 0 there was 1 added as extra
                return document.querySelector('.also[data-id="'+product.id+'"]').classList.add('stock-out');
            }
            if(inventory && sale) setAvailableStocks({...availableStocks, [product.id]: availableStock });
            
            if(!sale) {
                product = {...product, return : true }
            }

            let rest = {...KartProducts,[activeSession]: [...KartProducts[activeSession]??[], product] }
            setCartProducts(rest);

            dispatch({ type: 'CHOOSEN_PRODUCT', payload: rest });
            // update the current project highlight
            window.electronAPI?.reloadWindow({...rest, id: product.id })
        }
        
        setTimeout(()=>setVegetable(null),100)

    }

    const notOrdered = () => {
        console.log(uid);
        return !false;
    }

    const resetCart = () => {
        let rest = {...KartProducts, [activeSession]: []};
        setCartProducts(rest);
        dispatch({ type: "CHOOSEN_PRODUCT", payload: rest });
        window.electronAPI?.reloadWindow({ ...rest, id:0 });
    }

    // Reverse the stock decrement here
    const removeFromCart = index => {
        let rest = {...KartProducts, [activeSession]: KartProducts[activeSession].filter((item, i)=> i!== index) };
        setCartProducts(rest);
        dispatch({ type: 'CHOOSEN_PRODUCT', payload: rest });
        window.electronAPI?.reloadWindow({...rest, id:0 });
    }

    const toggleModal = () => setModal(!otherOpen);

    const openTheFuckingDay = e => {
        e.preventDefault();
        if(!enteredCash || enteredCash === '0') return Warning("You can't open without a single cash amount in drawer!");

        dispatch({ type: "LOADING" });
        axios.post("pos/opening-day-cash-amount", {cash: enteredCash}).then(({data}) => {
            
            if(data.status) {
                toast.success(data.message);
                dispatch({ type: "SET_CASH", payload: data.created })
                setOpeningAmount(data.created)
                setFocused('')
            } else toast.error(data.message);

        }).catch(()=>{}).finally(()=>dispatch({ type: "STOP_LOADING" }))

    }

    const showRate = (stock, unit) => {
        if( typeof stock==='string' && unit && ([0,1].includes(stock.indexOf('.')) && (stock[0]==='0' || stock[0]==='.'))) {
            stock = stock * 1000
            if(unit && unit==='kg') {
                unit = stock > 1000 ? unit: 'gm'
            } else if(unit) {
                unit = stock > 1000 ? unit: 'mg'
            }
        }
        stock = parseFloat(stock).toFixed(2)
        return stock;
    }

    const [items, setItems] = useState(prCategories);
    const [draggedItemIndex, setDraggedItemIndex] = useState(null);
    const handleDragStart = index => setDraggedItemIndex(index)

    const handleDragOver = (e, index) => {

        e.preventDefault();
        if (draggedItemIndex === index) return;
        const newItems = [...items];
        const draggedItem = newItems.splice(draggedItemIndex, 1)[0];
        newItems.splice(index, 0, draggedItem);
        setDraggedItemIndex(index);
        setItems(newItems);
        dispatch(
            commonApiSlice.util.updateQueryData(`getProductCategories`, undefined, cache => {
                cache['categories'] = newItems
            })
        )
        setCategories(newItems);

    }

    const cartClass = (item, index) => {

        let className = 'row chosen-product mt-1 ';
        if(item.other) {
            className += 'other-product';
        }
        if(currentProduct===index) {
            if(order.products??[].indexOf(item.id) !== -1) {
                if(order.data.quantity[item.id] !== item.stock ) {
                    className += "selected";
                }
            } else {
                className += "selected";
            }
        }
        return className;

    }

    const handleDrop = () => setDraggedItemIndex(null)

    const filterProducts = catID => {
        
        if(allProducts.isSuccess && allProducts.data.products) {
            setProducts(chunk(allProducts.data.products.filter(ite => ite.category_id===catID),chunkSize));
            toggleOther(!catID);
            if(chunk(allProducts.data.products.filter(ite => ite.category_id===catID),chunkSize)) setNoProduct(true)
        }

    }

    useEffect(() => {
        filterProducts(prCategories[0]?.id)
        return ()=> null
    },[]);

    const scrollToSection = (id=null) => {

        let el = document.querySelector(`.chosen-product.selected`);
        if(el) {
            el.scrollIntoView({
                behavior:'smooth',
                block: 'center'
            })
        }
        if(id){
            setTimeout(() => {
                const elem = document.querySelector('.chosen-product[data-id="'+id+'"]');
                if(elem) {
                    if(elem) {
                        elem.scrollIntoView({
                            behavior:'smooth',
                            block: 'center'
                        })
                    }
                }
            }, 1000);
        }
    };

    useEffect(()=>{
        if(taxLoaded) {
            setOptions(dbtaxes.taxes.map( t => ({...t, value: t.name +' '+t.amount, label: t.name+' '+t.amount})))
        }
        return ()=> null
    },[taxLoaded, dbtaxes])

    useEffect(() => {

        if( isSuccess && data.categories) {
            setCategories(data.categories)
            const cats = []
            data.categories.forEach( cat => (cats[cat.id] = cat.color))
            putCats(cats)
            setItems(data.categories)
        }

        if(allProducts.isSuccess) {

            setNoProduct(allProducts.data.products?.length === 0 );
            
            setProducts(chunk(allProducts.data.products, chunkSize))
            setInitialProducts(()=> allProducts.data.products);
            filterProducts(data?.categories[0]?.id)

        }

        return () => {
            setInitialProducts([])
            setProducts([])
        }

    },[ isSuccess, data, allProducts.data, allProducts.isSuccess, navigator ])

    useEffect(()=> {
        setCartProducts(cartProducts);
        scrollToSection()
        return () => {
            setCartProducts([]);
        }
    },[ cartProducts ]);

    useEffect(()=> {
        if(cartStocks){
            setAvailableStocks(cartStocks)
        }
        return () => setAvailableStocks({})
    },[location, cartStocks])
 
    const addCustomProduct = async e => 
    {
        e.preventDefault();
        const fd = new FormData();
        fd.append('name', custom.name);
        fd.append('price', custom.price);
        fd.append('image', custom.image);
        fd.append('tax', custom.tax);
        fd.append('catName', custom.catName);
        fd.append('category_id', custom.category_id);
        if(!custom.name || !custom.price ) {
            return Warning('Fill the required fields');
        }

        dispatch({ type:'LOADING' })
        const {data} = await axios.post(`/products/create-custom`, fd, {
            headers:{ 
                "Accept" :"application/json",
                "Content-Type" : "multipart/form-data",
                "asmara-token" : localStorage.getItem('asmara-token'),
            }
        });
        dispatch({ type: "STOP_LOADING" });
        if( data.status ) {
            setInitialProducts(prev => [...prev, data.product]);
            setCustom(() => ({image:null, price:'', name:'', barcode:'', stock:5000, return :true, category_id:''}))
            let {product} = data;
          
            setCurrent(KartProducts[activeSession]?.length??0)
            product = {...product, stock: 1 };

            setCartProducts({...KartProducts,[activeSession]: [...KartProducts[activeSession]??[], product] });
            window.electronAPI?.reloadWindow({...KartProducts,[activeSession]: [...KartProducts[activeSession]??[], product], id: product.id });
            dispatch({ 
                type: 'CHOOSEN_PRODUCT',
                payload: {...KartProducts,[activeSession]: [...KartProducts[activeSession]??[], product] } 
            });
            toast.success(data.message)
            setFocusedCustom('');
            toggleModal(!otherOpen);
            
        } else { 
            toast.error(data.message)
        }   
    }

    const handleFile = e => {
        const file = e.target.files[0]
        setCustom({...custom, image: file})
    }
    
    const { type, table , uid } = useParams();
    useEffect(() => {

        const handleDataReceived = (data) => {
            if (data && data.reload) {
                if (type === "customer") {
                    setCartProducts(typeof data.products === "string" ? JSON.parse(data.products) : data.products)
                    scrollToSection(data.id)
                }
            }
            if(data.manual){
                window.location.reload()
            }
        }
        window.electronAPI?.onDataReceived(handleDataReceived)

    }, []);

    useEffect(() => {
        if(type==='customer') {
            document.body.classList.add('bg-customer')
        } else {
            document.body.classList.remove('bg-customer')
        }
    },[ type ])

    const showTotal = (tax=false) => {
        
        if(KartProducts && KartProducts[activeSession]?.length){
            let additions = KartProducts[activeSession].filter( item => item.return === undefined )
            let returns = KartProducts[activeSession].filter( _ => _.return === true )
            let addTaxes = additions.reduce((a,c) => (a + (c.stock * c.taxAmount)), 0)
            let remTaxes = returns.reduce((a,c) => (a + (c.stock * c.taxAmount)), 0)
            additions = additions.reduce((acc, cur)=> acc + (cur.stock * parseFloat(cur.price)),0)
            returns = returns.reduce((acc, cur)=> acc + (cur.stock * parseFloat(cur.price)),0)
            if(tax) {
                return f(addTaxes-remTaxes)
            }
            return parseFloat(additions - returns).toFixed(2)

        } else {

            if(cartProducts && cartProducts[activeSession]?.length)
            {
                let additions = cartProducts[activeSession].filter( item => item.return === undefined )
                let returns = cartProducts[activeSession].filter( _ => _.return === true )
                additions = additions.reduce((acc, cur)=> acc + (cur.stock * parseFloat(cur.price)),0)
                returns = returns.reduce((acc, cur)=> acc + (cur.stock * parseFloat(cur.price)),0)
                return parseFloat(additions - returns).toFixed(2)
            }
        }
        return 0;
        
    }
    
    const changeInput = (input,e) =>
    {
        e.preventDefault();
        e.stopPropagation();
        if( editing ) { // price
            let newPriceAmount;
            if(input==='clear') {
                newPriceAmount = '0'
                setNumber('');
            } else {
                newPriceAmount = (number * 10 + input);
                newPriceAmount = formatAmount(newPriceAmount);
                setNumber((prev) => {
                    let newVal = prev * 10 + input;
                    return newVal;
                })
            }

            dispatch({
                type:"CHOOSEN_PRODUCT",
                payload: {...KartProducts,[activeSession]: KartProducts[activeSession].map((item, i)=> {
                    if(i === currentProduct ) {
                        item = { ...item, price:newPriceAmount }
                    }
                    return item
                })}
            });

            if(window.electronAPI) {
                window.electronAPI?.reloadWindow({ ...KartProducts,[activeSession]: KartProducts[activeSession].map((item, i)=> {
                    if(i=== currentProduct ) {
                        item = {...item, price: newPriceAmount }
                    }
                    return item
                }), id: KartProducts[activeSession][currentProduct]?.id })
            }
            return
        }
        
        let newStockAmount;
        if( editingQT ) {
            if(input==='clear') {
                newStockAmount = '0';
                setQty('');
            } else {
                newStockAmount = qty + input;
                if(inventory) {
                    let { quantity, unit } = cartProducts[activeSession][currentProduct];
                    if(unit) {
                        if(unit==='gm') {
                            quantity *= 1000;
                        }
                        if(unit === 'mg') {
                            quantity *= 1000000;
                        }
                    }
                    if( parseFloat(newStockAmount) > parseFloat(quantity)) return Warning( newStockAmount +` ${unit? unit:''} stocks are not available` );
                }
                setQty(newStockAmount);
            }

            dispatch({
                type:"CHOOSEN_PRODUCT",
                payload: {...KartProducts,[activeSession]: KartProducts[activeSession].map((item, i)=> {
                    if(i=== currentProduct ) {
                        item = {...item, stock:newStockAmount }
                    }
                    return item
                })}
            })
            if(window.electronAPI){ 
                window.electronAPI?.reloadWindow({...KartProducts,[activeSession]: KartProducts[activeSession].map((item, i)=> {
                    if(i=== currentProduct ) {
                        item = {...item, stock:newStockAmount }
                    }
                    return item
                }), id: KartProducts[activeSession][currentProduct]?.id })
            }
            
        }
    }

    const [presetTxt, setPreset] = useState('');

    useEffect(() => {
        ckeyboardRef.current?.setInput(typeof presetTxt==='number'? JSON.stringify(presetTxt): presetTxt)
    }, [presetTxt, focusedCustom])
    
    useEffect(() => {
        keyboardRef.current?.setInput(typeof presetTxt ==='number'? JSON.stringify(presetTxt): presetTxt)
    }, [presetTxt, focused])

    const [scale, setScale] = useState(localStorage.getItem('_keyboard_scale')??1); // Default scale (1 = 100%)

    const decrease = () => {
        localStorage.setItem('_keyboard_scale', Math.max(scale - 0.1, 0.5))
        setScale(prev => Math.max(prev - 0.1, 0.5))
    }

    const increase = () => {
        localStorage.setItem('_keyboard_scale', Math.min(JSON.parse(scale) + 0.1, 2))
        setScale(prev => Math.min(JSON.parse(prev) + 0.1, 2))
    }

    const [ totalAmount , setTotal ] = useState(0.00);
    useEffect(() => {
        setCounter(() => Random(0,3))
        if(typeof showTotal!== undefined) {
            setTotal(showTotal())
        }
    }, [])
    

    useEffect(() => {

        if(Object.keys(openingCash).length === 0) {
            axios.get(`/pos/last-active-session`, { headers: {
                'Content-Type' : 'application/json',
                'asmara-token': localStorage.getItem('asmara-token')
            }}).then(({ data }) => {
                if( data.status && data.session.status ) {
                    dispatch({ type:"SET_CASH", payload: data.session });
                    setOpeningAmount(data.session)
                }
            }).catch( err => {});

        }
        
        return ()=> null

    },[])

    return (
        <>
            <div className={`col-md-12 ${type==='customer' ? "d-flex align-self-center position-relative": "d-flex"}`} >
                { (Object.keys(openingAmountSet).length === 0 || !openingAmountSet.status === true) && type!=='customer'? (
                    <div className='overlay' style={{width:'100vw', height:'100vh',position:'absolute'}}>
                        <Modal isOpen={true}>
                            <Form onSubmit={openTheFuckingDay}>
                                <ModalHeader>
                                    <b>Day Opening!</b> <p>Good morning </p>
                                </ModalHeader>
                                <ModalBody>
                                    <Row>
                                        <Col>
                                            <FormGroup>
                                                <Label>
                                                    <b>Enter Opening Cash In Drawer</b>
                                                </Label>
                                                <Input
                                                    type={'text'}
                                                    placeholder={currency}
                                                    onClick={(e)=>{
                                                        setFocused('cash')
                                                        setPreset(enteredCash)
                                                    }}
                                                    onChange={e => setEnteredCash(e.target.value)}
                                                    value={enteredCash}
                                                    style={{border:'1px solid gray'}}
                                                />
                                            </FormGroup>
                                        </Col>
                                    </Row>
                                </ModalBody>
                                <ModalFooter className={'justify-content-center'}>
                                    <Col md={5} className='btn btn-light' onClick={()=> navigator('/')} >
                                        Back
                                    </Col>
                                    <Col md={5} >
                                        <button className='w-100 btn btn-success' type={`submit`} > Start </button>
                                    </Col>
                                </ModalFooter>
                            </Form>
                        </Modal>
                    </div>
                ): null}
                <div className={`col-md-4`} 
                    style={{
                        filter: Object.keys(openingAmountSet).length === 0 || !openingAmountSet.status === true ? 'blur(5px)':'',
                        width: type === 'customer'?'40vw':'38.8%'
                    }}
                >
                    { type!=='customer' ?
                    (
                    <div ref={sectionRef} className={`container ms-2 put-here ${KartProducts[activeSession] && KartProducts[activeSession].length && type!=='customer' ?'action-visible':''} ${minned ? "fully-visible":""}`} style={{borderRadius:'20px',backgroundColor:'#dadada'}}>
                        <div className={`card ${KartProducts[activeSession] && KartProducts[activeSession].length?'d-none':''}`} style={basePOS}>

                            {['bx-drink', 'bx-coffee','bx-food-menu','bx-restaurant'].map( (icon,i) => <i className={`bx ${icon} ${activated!==i ? 'd-none': ""}`} style={{fontSize:60}}/>)}
                            {/* { Object.keys(tableOrders).map( ses => ses !== (table??"") && ses && <button 
                                onPointerDown={()=>navigator(`/pos/${ses}`)}
                                className="btn-rounded btn btn-sm btn-primary position-absolute" style={getRandomDimensions()}>
                                    {ses}
                                </button>
                            )} */}
                            <b className={`mt-3`}>Start adding products</b>

                        </div>
                        { KartProducts[activeSession] && KartProducts[activeSession].map( (item,index) => (
                            <div key={index}
                                className={cartClass(item, index)}
                                data-id={item.id}
                                data-index={index}
                                onClick={()=>setCurrent(index)}
                                style={{
                                    border:item.return && '2px dashed orange',
                                    background: order.data?.quantity ? (order?.data?.quantity[item.id] === item.stock && '#f9f2c5'): "",
                                    color: item.return && 'black'
                                }}
                            >
                                <div className={`d-flex w-100`}>
                                    <b style={{maxWidth:'24rem'}}> {item.stock +' x '+item.name} </b>
                                    <strong className={`price`}>
                                        {item.return ? '-':null} {currency +' '+ formatAmount((item.stock * f(item.price)).toFixed(2) * 100 )}
                                    </strong>
                                </div>
                                <div className={`d-flex`}>
                                    <span className={`quantity`}>
                                        {type==='customer' && 'Qty:'+ showRate(item.stock, item.unit)} 
                                    </span>
                                    {item.id!=='quick' && <span>{`${currency+' '+ f(item.price)} / units`}</span>}
                                </div>
                                { type!=='customer' && <div className='d-flex'>
                                    <span 
                                        className={(currentProduct===index && !item.return && theme==='retro'?"text-white":'') + ' fs-3 btn bx-'}>
                                        <i data-index={index} onClick={()=> reduceQt(index) } className="bx bx-minus"/>
                                    </span>
                                    <span className={(currentProduct===index && !item.return && theme==='retro'?"text-white":'') + ' fs-3 btn add'}>
                                        <i data-index={index} onClick={()=> increaseQt(index)} className="bx bx-plus"/>
                                    </span>
                                    <button className={`${theme==='retro' && currentProduct===index && !item.return ? "text-white":''} btn fs-3`}
                                    onClick={()=>removeFromCart(index)}>
                                        <i className="bx bx-x"/>
                                    </button>
                                </div>}
                            </div>
                        ))}

                    </div>)
                    : <div className='library d-grid justify-content-center align-items-center w-100 h-100' style={{placeItems:'end'}}>
                        <div style={{cssText:"width:80%!important;text-align:center"}}>
                            <div style={{border:'1px solid'}}>
                                <h2 className='text-center' style={{ fontSize:'3rem', fontWeight:'900', padding:'6px 0px' }}>
                                    Total is &nbsp;&nbsp;{ currency + showTotal()} 
                                </h2>
                            </div>
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
                    }

                    <div className={`container ms-2 mt-2 actionBar ${KartProducts[activeSession] && KartProducts[activeSession].length && type!=='customer' ? '':'d-none'}`} style={{height: '38vh'}}>
                        <div className="row">
                            <div className="col-sm-12 d-flex">
                                <div className="col-sm-7 d-flex">
                                    <button 
                                        type={'button'}
                                        className={"btn btn-light btn-rounded text-white "}
                                        style={{backgroundColor:'#04537d',width:'70%', zIndex:9999}}
                                        disabled={order?.status === 'in-kitchen' && f(showTotal())===order?.total}
                                        onPointerUp={()=> placeOrder()}
                                    >
                                        {order?.status === 'in-kitchen' && f(showTotal())===order?.total ? "In Kitchen": 'Order'}
                                    </button>
                                    {
                                        order.payment !== 'paid' && 
                                        <button 
                                            type={'button'}
                                            className="btn btn-light btn-rounded text-white offset-1"
                                            style={{backgroundColor:'#452077ff',width:'75%', zIndex:9999}}
                                            onPointerUp={()=> navigator( activeSession && activeSession!== undefined ? ('/payment/'+ activeSession): '/payment/' )}
                                        >
                                            Payment
                                        </button>
                                    }
                                    <span 
                                        className={`fs-1 ms-2 bx bx-chevron-${minned ?'up':"down" } ${theme==='dark'? "text-white": "text-dark"}`} 
                                        onClick={()=>setMin(!minned)} 
                                    />
                                </div>
                                <div className="col-sm-5 d-flex justify-content-end align-items-center position-relative">
                                    <div className={'position-absolute'}>
                                        <p style={{lineHeight:2.1,whiteSpace:'nowrap'}}>
                                            <b> Total: &nbsp;
                                                <span className="total-amount" style={{left:0,fontSize:'2.3rem'}}>
                                                    { (currency + showTotal()).replace(" ",'') }
                                                </span>
                                            </b>
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div className={`div indicator ${minned ? 'd-none':''}`}>
                            <div className="row mt-1">
                                {[1,2,3].map( it=> <CalcButton key={it} onClick={e=>changeInput(it,e)} disabled={!editing && !editingQT} style={btnStyle} text={it}/>)}
                                <div className="col-sm-3 calc" onClick={resetCart}>
                                    <button className={`btn btn-dark num w-100`} type="button" style={{...btnStyle,padding:5}}> Clear Items </button>
                                </div>
                            </div>
                            <div className="row mt-1">
                                { [4,5,6].map( it=> <CalcButton key={it} disabled={!editing && !editingQT} style={btnStyle} text={it} onClick={e=>changeInput(it,e)}/>)}
                                <div className="col-sm-3"/>
                            </div>
                            <div className="row mt-1">
                                {[7,8,9].map( ite => <CalcButton key={ite} disabled={!editing && !editingQT} style={btnStyle} text={ite} onClick={(e)=> changeInput(ite,e)} />)}
                                <div className="col-sm-3 calc" onClick={()=> {
                                    if( editingQT===true ) {
                                        setQty('')
                                    }
                                    setEditing(false);
                                    setEditingQT(!editingQT);
                                }}>
                                    <button className={`btn btn-dark text-white num w-100`} style={{...btnStyle,padding:10,height:46}}>
                                        <b className='num'>{!editingQT?'Edit Qty':'Done'}</b> 
                                    </button>
                                </div>
                            </div>
                            <div className="row mt-1">
                                <div className="col-sm-3 calc">
                                    <button className="btn btn-light num w-100 text-white" onClick={()=> setCustomerModalOpen(!customerModalOpen)} style={{...btnStyle, background:"#891d89"}}> <b> Customer </b> </button>
                                </div>
                                <div className="col-sm-3 calc">
                                    <button className={`btn btn-dark num w-100 text-white`} disabled={!editing && !editingQT} onClick={e=> changeInput(0, e)} style={btnStyle}> <b> 0 </b> </button>
                                </div>
                                <div className="col-sm-3 calc">
                                    <button className={`btn btn-dark num w-100 text-white`} disabled={!editing && !editingQT} onClick={e=>changeInput('clear',e)} style={{...btnStyle,padding:'15px 10px'}}> <b>Reset</b> </button>
                                </div>
                                <div className="col-sm-3 calc" onClick={(e)=> {
                                    setEditingQT(false)
                                    setEditing(!editing)
                                }}>
                                    <button className={`btn btn-dark num w-100`} style={{...btnStyle,padding:'5px 0px',height:46}}> 
                                        {!editing?'Edit Price':'Done'} 
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                    
                </div>
                {type!=='customer' ? 
                (<>
                    <div className="col-md-2">
                        <Menu
                            categories={prCategories} 
                            cRef={cRef}
                            filter={filterProducts}
                            handleDragStart={handleDragStart}
                            handleDragOver={handleDragOver}
                            handleDrop={handleDrop}
                            scrollTop={scrollTop}
                        />
                    </div>
                    <div className="col-md-5 library"
                        style={{
                            height:'90vh',
                            marginLeft:20,
                            filter: Object.keys(openingAmountSet).length === 0 || !openingAmountSet.status === true ? 'blur(5px)':''
                        }}
                    >
                        <Items 
                            menus={prCategories}
                            products={products}
                            addToCart={addToCart}
                            cartStocks={cartStocks}
                            displayImage={displayImage}
                            Other={Other}
                            chunkSize={chunkSize}
                            toggleModal={toggleModal}
                            otherOpen={otherOpen}
                            catColors={catColors}
                            theme={theme}
                            isInventory={inventory}
                        />
                        {products.length === 0 && !Other && (<div className="lib-loader justify-content-center align-items-center" 
                        style={{height:'30rem',placeContent:'center',textAlign:'center'}} >
                            {
                                noProduct && isSuccess? <>
                                <h2>  {prCategories.length ? `No products for this category`: 'No products...'}</h2>
                                </> :
                                <i className='fa fa-spin fa-spinner' />
                            }
                        </div>)}
                    </div>
                </>): 
                <div className='col-md-6'>
                    <div className="row">
                        <div className="col-12 text-center">
                            <div>
                                <img src={logo} alt="" style={QR} />
                                <h4 className='mt-2'><b>Join our Whatsapp community</b></h4>
                            </div>
                        </div>
                        <div className="col-12 text-center">
                            <h1 style={cFont}>Thanks For Choosing 
                                <br />
                                Asmara Food Store
                                <br />
                            </h1>
                        </div>
                        <div className="col-12 text-center">
                            <div className="row">
                                <div className="col-6">
                                    <img src={logo} alt="" style={QR}/>
                                    <h4 className='mt-2'><b>Follow us on Insta</b></h4>
                                </div>
                                <div className="col-6">
                                    <img src={logo} alt="" style={QR}/>
                                    <h4 className='mt-2'><b>Add us on Facebook</b></h4>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
                }
            </div>
            <Modal isOpen={otherOpen} fade={false}>
                <Form onSubmit={addCustomProduct}>
                    <ModalBody style={{padding:30}}>
                        <Row>
                            <div className='col-4'>
                                <Label> Name </Label>
                            </div>
                            <div className='col-8'>
                                <FormGroup>
                                    <input 
                                        type='text'
                                        onChange={e => setCustom({...custom, name: e.target.value})}
                                        value={custom.name}
                                        placeholder='Abc'
                                        onClick={e => {
                                            setFocusedCustom('name')
                                            if(custom.name.length === 0) {
                                                setLayout('shift')
                                            }
                                            setPreset(custom.name)
                                        }}
                                        className='input'
                                    />
                                </FormGroup>
                            </div>
                        </Row>
                        <Row>
                            <div className='col-4'>
                                <Label> Price </Label>
                            </div>
                            <div className='col-8'>
                                <FormGroup>
                                    <input 
                                        type='text'
                                        className='input'
                                        onChange={e => setCustom({...custom, price: e.target.value})}
                                        onClick={e => {
                                            setFocusedCustom('price')
                                            setPreset(custom.price)
                                        }}
                                        value={custom.price}
                                        placeholder={currency}
                                    />
                                </FormGroup>
                            </div>
                        </Row>
                        <Row>
                            <div className='col-4'>
                                <Label> Tax </Label>
                            </div>
                            <div className='col-8'>
                                <FormGroup>
                                    <CreatableSelect 
                                        name='tax'
                                        onFocus={()=> setFocusedCustom('')}
                                        onChange={e =>{setCustom({...custom, tax: e.value })}}
                                        defaultValue={options[0]}
                                        options={options}
                                    />
                                </FormGroup>
                            </div>
                        </Row>
                        
                        <Row>
                            <div className='col-4'>
                                <Label> Category </Label>
                            </div>
                            <div className='col-8'>
                                <FormGroup>
                                    <CreatableSelect 
                                        name='category_id'
                                        onFocus={()=>setFocusedCustom('')}
                                        onClick={()=>setFocusedCustom('')}
                                        onChange={ e => {setCustom({...custom, category_id: e.value, catName: e.label })}}
                                        options={prCategories.map( ca=> ({...ca, value: ca.id, label: ca.name}))}
                                    />
                                </FormGroup>
                            </div>
                        </Row>
                        
                        <Row>
                            <label className='custom-file-upload bg-primary text-white' > 
                                <i className={'bx bx-paperclip'} /> &nbsp;
                                <Input 
                                    type='file' 
                                    className='d-none'
                                    accept='image/*'
                                    onChange={handleFile}
                                />
                                Upload Product Image
                            </label>
                        </Row>
                    </ModalBody>
                    <ModalFooter>
                        <button className='btn btn-light btn-rounded' type='button' onClick={()=> {
                            toggleModal(!otherOpen)
                            setFocusedCustom('')
                        }} > Close </button>
                        <button className='btn btn-warning btn-rounded'> Add Product </button>
                    </ModalFooter>
                </Form>
            </Modal>
            

            {focused && !hasKeyboard && <div className='mt-4 position-fixed w-50' style={{zIndex:9999, top:60 }}>
                <div
                    style={upperStyle}
                >
                    <div
                        style={{...outerStyle,
                            width: 400,
                            top: `${position.y}px`,
                            left: `${position.x}px`,
                            cursor: dragging ? "grabbing" : "grab",
                            transform: `scale(${scale})`
                        }}
                    >
                        <div
                            onPointerMove={handleMouseMove}
                            onPointerUp={handleMouseUp}
                            onPointerDown={handleMouseDown}
                            style={innerStyle}
                        >
                            <Button text={<i className='bx bx-minus'/>} onClick={decrease}/>
                            <span>Hold To Drag</span> 
                            <Button text={<i className='bx bx-plus'/>} onClick={increase}/>
                        </div>
                            <Keyboard
                                onChange={e => setEnteredCash(e)}
                                keyboardRef={(r) => (keyboardRef.current = r)}
                                layout={{
                                    default: numPad,
                                }}
                                display={{
                                    "{bksp}": 'x'
                                }}
                            />
                        <div className='bg-white d-flex board-navs' style={footerStyle}>
                            <Button text={'CLEAR'} 
                            onClick={()=> {
                                setLayout('shift')
                                setEnteredCash('');
                                keyboardRef.current.clearInput();
                            }}
                            />
                            <Button onClick={()=>{setFocused('');setPosition(()=>defPosition)}} text={'CLOSE'} />
                        </div>
                    </div>
                </div>
            </div>
            }

            {(otherOpen||focusedCustom) && !hasKeyboard && <div className="mt-4 position-fixed w-50" style={{zIndex:9999,top:60}}>
                <div style={upperStyle}>
                    <div
                        style={{ ...outerStyle,
                            width: ['price','stock','vStock','vPrice'].includes(focusedCustom)? 420: 700,
                            top: `${position.y}px`,
                            left: `${position.x}px`,
                            cursor: dragging ? "grabbing" : "grab",
                            transform: `scale(${scale})`
                        }}
                    >
                        <div
                            onPointerMove={handleMouseMove}
                            onPointerUp={handleMouseUp}
                            onPointerDown={handleMouseDown}
                            style={innerStyle}
                        >
                            <Button text={<i className="bx bx-minus"/>} onClick={decrease}/>
                            <span> Hold To Drag </span>
                            <Button text={<i className="bx bx-plus"/>} onClick={increase} />
                        </div>
                        <Keyboard
                            onChange={fillCustom}
                            keyboardRef={r => (ckeyboardRef.current = r)}
                            onKeyPress={e => {
                                if(e === "{lock}") {
                                    setLayout((prev) => (prev === "default" ? "shift" : "default"))
                                }
                            }}
                            layout={{
                                default: ['price','stock','vStock','vPrice'].includes(focusedCustom)? numPad: lowerCase,
                                shift: ['price','stock','vStock','vPrice'].includes(focusedCustom)? numPad: upperCase
                            }}
                            display={{
                                "{bksp}":['price','stock','vStock','vPrice'].includes(focusedCustom) ? 'X': 'backspace',
                                '{space}' : " ",
                                '{lock}' : "Caps"
                            }}
                            layoutName={layout}
                        />
                        <div className={`bg-white d-flex board-navs ${['price','stock','vStock','vPrice'].includes(focusedCustom) ? 'numeric': ''}`} style={footerStyle}>
                            <Button text={'CLEAR'} 
                            onClick={()=>{
                                setLayout('shift');
                                // setFocusedCustom('');
                                setCustom({...custom, [focusedCustom]:''});
                                ckeyboardRef.current.clearInput();
                            }}/>
                            <Button text={'CLOSE'} onClick={()=>{setFocusedCustom('');setPosition(()=>defPosition)}} />
                        </div>
                    </div>
                </div>
            </div>}

            {(vegetable || focusedVeg) && !hasKeyboard && <div className='mt-4 position-fixed w-50' style={{zIndex:9999, top:60 }}>
                <div
                    style={upperStyle}
                    >
                    <div
                        style={{ ...outerStyle,
                            width: 400,
                            top: `${position.y}px`,
                            left: `${position.x}px`,
                            cursor: dragging ? "grabbing" : "grab",
                            transform: `scale(${scale})`
                        }}
                        className='numeric'
                    >
                        <div
                            onPointerMove={handleMouseMove}
                            onPointerUp={handleMouseUp}
                            onPointerDown={handleMouseDown}
                            style={innerStyle}
                        >
                            <Button text={<i className='bx bx-minus'/>} onClick={decrease}/>
                            <span> Hold To Drag </span> 
                            <Button text={<i className='bx bx-plus'/>}  onClick={increase} />
                        </div>
                        <Keyboard
                            onChange={fillVeg}
                            keyboardRef={(r) => (ckeyboardRef.current = r)}
                            layout={numeric0}
                            display={{
                                "{bksp}":"Back",
                                '{space}' : " ",
                                '{lock}' : "Caps"
                            }}
                            layoutName={layout}
                        />
                        <div className={`bg-white d-flex board-navs numeric`} style={{...footerStyle, gap:8}}>
                            <Button text={'CLEAR'} onClick={()=>{
                                setLayout('shift')
                                setVegetable({...vegetable, price:0.00 })
                                ckeyboardRef.current.clearInput()
                            }} />
                            <Button text={'CLOSE'}  onClick={()=>{
                                setFocusedVeg('');
                                setVegetable(null);
                            }} />
                        </div>
                    </div>
                </div>
            </div>}
            {vegetable && <Modal isOpen={true}>
                <Form onSubmit={addVeg}>
                    <ModalHeader>
                        <b>{vegetable.name}</b>
                        <small> {vegetable.catName} </small> <br/>
                    </ModalHeader>
                    <ModalBody>
                        <Row>
                            <Col>
                                <FormGroup>
                                    <Label>
                                        Price
                                    </Label>
                                    <Input 
                                        type={'text'}
                                        onClick={(e)=> {
                                            setFocusedVeg(true)
                                        }}
                                        onChange={ e => setVegetable({...vegetable, price: e.target.value}) }
                                        value={vegetable.price??0.00}
                                    />
                                </FormGroup>
                            </Col>
                        </Row>
                    </ModalBody>
                    <ModalFooter className={'justify-content-center'}>
                        <Col md={5} className='btn btn-light' onClick={()=> {setVegetable(null);setFocusedVeg('');setPosition(()=>defPosition)}} >
                            Cancel
                        </Col>
                        <Col md={5}>
                            <button className='w-100 btn btn-success' type={`submit`}> Add </button>
                        </Col>
                    </ModalFooter>
                </Form>
            </Modal>}


            { customerModalOpen && <Modal isOpen={true} size='lg' fade={false}>
                { addingCustomer ? 
                <Form onSubmit={addCustomer}>
                    <ModalHeader>
                        Enter Customer Details 
                    </ModalHeader>
                    <ModalBody>
                        <Row>
                            <FormGroup>
                                <Input name='name' placeholder='Name' id='name' onChange={handleCustomer}/>
                            </FormGroup>
                            <FormGroup>
                                <Input name='email' placeholder='Email' id='email' onChange={handleCustomer}/>
                            </FormGroup>
                            <FormGroup>
                                <Input name='phone' placeholder='Phone' id='phone' onChange={handleCustomer}/>
                            </FormGroup>
                            <FormGroup>
                                <Input name='note' placeholder='Add a note...' id='note' onChange={handleCustomer}/>
                            </FormGroup>
                        </Row>
                    </ModalBody>
                    <ModalFooter>
                        <button className='btn btn-light btn-rounded' type='button' onClick={()=> {setAddingCustomer(false);setPosition(()=>defPosition)}}>Cancel</button>
                        <button className='btn btn-success btn-rounded' > Create </button>
                    </ModalFooter>
                </Form>
                : (
                    <>
                    <ModalHeader>
                        <div className="d-flex space-between" style={{width:'100%'}}>
                            <span>  Customers </span>
                        </div>
                    </ModalHeader>
                    <ModalBody>
                        <div className='position-relative'>
                            <button 
                                className='btn btn-primary position-absolute' 
                                onClick={()=>setAddingCustomer(!addingCustomer)} 
                                style={{ top:-82, right:0 }}
                            >
                                <i className='bx bx-plus me-1'/>
                                New
                            </button>
                        </div>

                        <div className="table-responsive">
                            <table className='table'>
                                <thead className="bg-light bg-opacity-50">
                                    <tr>
                                        <th>
                                            <div className="form-check ms-1">
                                                <input type="checkbox" className="form-check-input" id="customCheck1" />
                                                <label className="form-check-label" for="customCheck1"></label>
                                            </div>
                                        </th>
                                        <th> Name </th>
                                        <th> Phone </th>
                                        <th> Email </th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {customers.length===0 ? 
                                    <tr>
                                        <td colSpan={3} className='text-center'>
                                            <span>No customers added yet</span>
                                        </td>
                                    </tr>
                                    : customers.map( c => <tr key={c.id} className={`${c.selected ? "selected-customer": ""} `}>
                                        <td>
                                            <span className='btn badge badge-soft-success' onClick={()=>selectCustomer(c)}>{c.selected ? "selected":"select"}</span>
                                        </td>
                                        <td>{c.name}</td>
                                        <td>{c.phone}</td>
                                        <td>{c.email}</td>
                                    </tr>)}
                                </tbody>
                            </table>
                        </div>
                    </ModalBody>
                    <ModalFooter>
                        <button className='btn btn-secondary' onClick={()=>setCustomerModalOpen(false)}>Close</button>
                    </ModalFooter>
                    </>
                )}

            </Modal> }
        </>
    )
}

export default memo(POS)