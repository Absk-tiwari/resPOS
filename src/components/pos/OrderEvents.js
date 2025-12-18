import { echo } from './echo';
import Pusher from 'pusher-js';
import { useEffect } from "react";
import toast from 'react-hot-toast';
import { commonApiSlice, useDigSessionMutation } from '../../features/centerSlice';
import { useDispatch } from 'react-redux';

export function useOrderEvents() {

    const dispatch = useDispatch();
    const [ digSession ] = useDigSessionMutation();

    useEffect(() => {
        
        Pusher.logToConsole = false;
        const channel = echo.channel("Order");

        channel.listen(".order.update", async event => {
            console.log("By pusher: ", event);
            if(event.data?.order_id) {
                await digSession({order: event.data.order_id}).unwrap();
            }
            toast.success(event.message, { duration: 5000 });
            dispatch(commonApiSlice.util.invalidateTags(['Tables', 'Order']));
        });

        return () => {
            echo.leave("Order");
        }

    }, []);

}
