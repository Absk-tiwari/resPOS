export const Button = ({text, onClick}) => {
    return <button className={'btn btn-light btn-rounded foot-btn'} style={{padding:'10px 12px'}} onClick={onClick}>{text}</button>
}
