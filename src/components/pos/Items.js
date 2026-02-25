import labelImg from '../../assets/images/default.png';
import { dealHost, hexToRgb, isColorDark, wrapText } from '../../helpers/utils';
import addNew from '../../assets/images/image.png';

function Items({
    products,
    addToCart,
    cartStocks,
    displayImage,
    Other,
    chunkSize,
    toggleModal,
    otherOpen,
    isInventory,
    catColors,
    theme
}) {

    const handleImgError = e => e.target.src = labelImg;
    function isFloat(n) {
        return n === +n && n !== (n | 0);
    }
    const float = (n, d) => {
        return parseFloat(n).toFixed(d)
    }
    return (
        <>
            <div className='row'>
                {
                    Other && (
                        <div className={`col-md-2 also`} onClick={() => toggleModal(!otherOpen)}>
                            <div className='cell'>
                                <div className='w-100'>
                                    <img className='title-img' src={addNew} alt={"Other"} style={{ objectFit: 'contain' }} />
                                </div>
                                <div className='w-100' style={{ color: 'black', background: 'lightgray' }}>
                                    <strong className='wrapped-text'>
                                        Add New &nbsp;
                                        <span className='bx bx-plus fs-5' />
                                    </strong>
                                </div>
                            </div>
                        </div>
                    )
                }
                {products.map(row => row.map(product => (
                    <div key={product.id}
                        className={`col-md-${chunkSize === 6 ? '3' : '3'} mb-2`}
                        onClick={() => addToCart(product.id, product.catName ?? 'null')}
                    >
                        <div
                        >
                            <div className={'cell'} style={{ minHeight: 90, background: '#fff', alignItems:'center' }}>
                                {
                                    displayImage &&
                                    <div className={'w-100'}>
                                        <img
                                            className={'title-img'}
                                            src={dealHost(product.thumb ?? product.image ?? labelImg)}
                                            onError={handleImgError}
                                            alt={product.name}
                                        />
                                    </div>
                                }
                                <div
                                    className={'w-100'}
                                    style={{ 
                                        color: isColorDark(hexToRgb(catColors[product.category_id])) ? 'white' : 'black', 
                                        background: catColors[product.category_id],
                                        padding:10
                                    }} >
                                    <strong
                                        className={'wrapped-text'}
                                        style={{
                                            alignContent: 'center',
                                            fontSize: product.name.length > 18 ? '0.9rem' : '1rem',
                                            color: "black"
                                        }}
                                    >
                                        {product.seq + ". " + (displayImage ? wrapText(product.name, 20) : product.name)}
                                        {product.name.length > 22 && <span className={'tooltiptext'}>{product.name}</span>}
                                    </strong>
                                </div>
                                {displayImage===false && <small className='text-center p-10'>€ {product.price}</small>}

                            </div>
                        </div>
                        {displayImage && <small className='price-tag'>€ {product.price}</small>}
                        <div className='extras'>
                            <div className='tax d-flex'>
                                <p style={{ paddingRight: 3 }}> Tax: </p>
                                <div style={{ fontSize: '1rem', width: 50 }}>{product.tax ?? '0 %'}</div>
                            </div>
                            {isInventory && <div className='stock'>
                                <p>Items : </p>
                                <div style={{ fontSize: '1rem' }}>
                                    {isFloat(product.quantity - (cartStocks[product.id] ?? 0)) ?
                                    float(product.quantity - (cartStocks[product.id] ?? 0), 2)
                                    : product.quantity - (cartStocks[product.id] ?? 0)}
                                </div>
                            </div>}
                        </div>
                    </div>
                )))
                }
            </div>
        </>
    )
}

export default Items