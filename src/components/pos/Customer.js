import React, { memo, useCallback, useEffect, useRef, useState } from 'react'
import { Form, FormGroup, Modal, ModalBody, ModalFooter, ModalHeader, Row } from 'reactstrap';
import VirtualKeyboard from '../layouts/Keyboard';

export const Customer = memo(({
    customer,
    data,
    open,
    select,
    adding,
    setAdding,
    addCustomer,
    handle,
    close,
    position,
    setPosition,
}) => {

    const debounceRef = useRef(null);
    const keyboardRef = useRef(null);
    const [input, setInput] = useState('')
    const [searching, setSearching] = useState(false);
    const preset = input;

    useEffect(() => {
        keyboardRef?.current?.setInput(preset)
    }, [searching, preset])

    const handleClick = useCallback(val => {
        setSearching(true);
        setInput('')
    }, []);

    const debouncedSearch = useCallback((value) => {
        clearTimeout(debounceRef.current);
        debounceRef.current = setTimeout(() => {
            // 🔥 Your API call / filter logic here
            setInput(value);
            console.log("Searching for:", value);
        }, 400);
    }, []);

    if (open && adding) return (
        <Modal isOpen={true} size='lg' fade={false}>
            <Form onSubmit={addCustomer}>
                <ModalHeader>
                    Enter Customer Details
                </ModalHeader>
                <ModalBody>
                    <Row>
                        <FormGroup>
                            <input className='form-control' name='first_name' placeholder='First name' id='first_name' onChange={handle} />
                        </FormGroup>
                        <FormGroup>
                            <input className='form-control' name='last_name' placeholder='Last name' id='last_name' onChange={handle} />
                        </FormGroup>
                        <FormGroup>
                            <input className='form-control' name='email' placeholder='Email' id='email' onChange={handle} />
                        </FormGroup>
                        <FormGroup>
                            <input className='form-control' name='phone' placeholder='Phone' id='phone' onChange={handle} />
                        </FormGroup>
                        <FormGroup className='w-100'>
                            <textarea className='form-control' rows={5} name='note' placeholder='Add a note...' id='note' onChange={handle} />
                        </FormGroup>
                    </Row>
                </ModalBody>
                <ModalFooter>
                    <button
                        className='btn btn-light btn-rounded' type='button'
                        onClick={() => {
                            setAdding(false);
                            setPosition(() => position)
                        }}
                    >
                        Cancel
                    </button>
                    <button className='btn btn-success btn-rounded' > Create </button>
                </ModalFooter>
            </Form>
        </Modal>
    )
    return (
        <>
            {open && <Modal isOpen={true} size='lg' fade={false}>
                <ModalHeader>
                    <div className="d-flex space-between" style={{ width: '100%' }}>
                        <span>  Customers </span>
                    </div>
                </ModalHeader>

                <ModalBody>
                    <div className='position-relative'>
                        <input
                            className='input position-absolute'
                            placeholder='Search...'
                            style={{ top: -14, borderRadius: 5, border: searching ? "2px solid blue" : "1px solid gray" }}
                            onClick={handleClick}
                            onKeyUp={(e) => debouncedSearch(e.target.value)}
                            value={input}
                        />
                        <button
                            className='btn btn-primary position-absolute btn-sm btn-rounded'
                            onClick={() => setAdding(!adding)}
                            type='button'
                            style={{ top: -62, right: 0 }}
                        >
                            <i className='bx bx-plus me-1' />
                            New
                        </button>
                    </div>

                    <div className="table-responsive" style={{ marginTop: -15 }}>
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
                                {data.length === 0 ?
                                    <tr>
                                        <td colSpan={3} className='text-center'>
                                            <span>No customers added yet</span>
                                        </td>
                                    </tr>
                                    : data.map(c => <tr key={c.id} className={`${c.selected ? "selected-customer" : ""} `}>
                                        <td>
                                            <span className='btn badge badge-soft-success' onClick={() => select(c)}>{c.selected ? "selected" : "select"}</span>
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
                    <button className='btn btn-secondary' onClick={() => close(false)}>Close</button>
                </ModalFooter>
            </Modal>}
            {searching &&
                <VirtualKeyboard
                    ref={keyboardRef}
                    fields={input}
                    setFields={setInput}
                    change={debouncedSearch}
                    position={position}
                    setPosition={setPosition}
                    target={searching}
                    setTarget={setSearching}
                />
            }
        </>
    )
})
