import { createContext, useState, useContext, useCallback } from "react";
import { useGetTablesQuery } from "../features/centerSlice";
import { useSelector } from "react-redux";

const SearchContext = createContext();

export const SearchProvider = ({ children }) => {

    const [ searchQuery, setSearchQuery ] = useState("");
    const { openingCash:stateCash } = useSelector(s => s.auth);
    const [ openingCash ] = useState(stateCash);
    const [ focused, setFocused ] = useState(false);
    const token = localStorage.getItem('asmara-token');
    const { refetch } = useGetTablesQuery(token, { skip: false  });// !token
    const [ sale, setType ] = useState(JSON.parse(localStorage.getItem('_is_sale')??'true'));
    const lastActive = openingCash.lastSession ?? 0;
    const [ sessions, setSession ] = useState([1]);
    const [ ongoing, setOngoing ] = useState({})
    const [ activeSession, setActiveSession ] = useState( lastActive ? lastActive : sessions[sessions.length-1]);
    const [ displayImage, setImageDisplay ] = useState(JSON.parse(localStorage.getItem('img_disp')??'true'))

    const handleImageDisplay = useCallback(
        display => {
            localStorage.setItem('img_disp', display );
            refetch()
            setImageDisplay(display);
        },
      [refetch],
    )

    return (
        <SearchContext.Provider 
        value={{
            sale,
            ongoing,
            setOngoing,
            setType,
            searchQuery, 
            setSearchQuery, 
            sessions,
            setSession,
            activeSession,
            setActiveSession,
            displayImage,
            handleImageDisplay,
            setFocused,
            focused
        }}>
            {children}
        </SearchContext.Provider>
    );
};

// Custom hook for using the context
export const useSearch = () => useContext(SearchContext);