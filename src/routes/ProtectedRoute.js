import { Navigate } from "react-router-dom";
import { useSelector } from "react-redux"; // or however you store auth state

export const ProtectedRoute = ({ children }) => {

    const { userToken } = useSelector( state => state.auth ); 

    if (!userToken) {
      return <Navigate to="/login" replace />;
    }

    return children;
    
};
