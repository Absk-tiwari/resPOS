import React, { memo, useState } from 'react'

function Menu({ categories, cRef, filter, handleDragStart, handleDragOver, handleDrop, scrollTop }) {
    const [ currentCat, setCurrent ] = useState(0);
    return (
        <div style={{ minHeight:70, zIndex:100 }}>
            <div className={`category ms-2`} style={{flexWrap:'nowrap',overflowY:'auto',maxHeight:'88vh'}} ref={cRef}>
                { categories.map((Cat,i) =>  <div key={i} 
                        className={`category-item ${i===currentCat?'active':''} bg-secondary text-white`} 
                        onClick={()=>{filter(Cat.id);setCurrent(i)}}
                        draggable={true}
                        onDragStart={() => handleDragStart(i)}
                        onDragOver={e => handleDragOver(e,i)}
                        onDrop={handleDrop}
                    >
                        {(Cat.name).includes('/') ? (Cat.name).split('/')[1]: Cat.name }
                    </div>
                )
                }
                <div className='category-item' onClick={()=> filter(null)} style={{background:"azure"}}>
                    Other 
                </div>
            </div>
            <div className='position-fixed t-scroller' style={{bottom:40,right:40}} onClick={scrollTop}>
                <button className='btn btn-rounded btn-danger' style={{border:"1px dashed"}}>
                    <i className='bx bx-up-arrow'/>
                </button>
            </div>
        </div>
    )
}

export default memo(Menu)