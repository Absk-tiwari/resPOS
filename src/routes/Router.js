import { lazy } from "react";
import { Navigate } from "react-router-dom"; 
import { ProtectedRoute } from './ProtectedRoute.js'

const FullLayout = lazy(() => import("../components/layouts/FullLayout.js"));

/***** Pages ****/
const Login = lazy(()=>import("../components/auth/Login.js"))
const Dashboard = lazy(() => import("../components/Dashboard.js"));
const Disconnected = lazy(() => import("../components/Disconnected.js"));
const Floors = lazy(() => import("../components/Floors.js"));
const POS = lazy(() => import("../components/pos/POS.js"));
const Payment = lazy(() => import("../components/pos/Payment.js"));
const OrdersTable = lazy(() => import("../components/orders/OrdersTable.js"));

/*****Routes******/
const ThemeRoutes = [
  {
    path: "/",
    element: <FullLayout />,
    children: [
      { path: "/", element: <Navigate to="/floors" /> },
      { path: "/login", exact: true, element:<Login />},
      { path: "/dashboard", 
        exact: true, 
        element: (
          <ProtectedRoute>
            <Dashboard key={11}/>
          </ProtectedRoute>
        )
      },
      {
        path: "/disconnected",
        element: (<ProtectedRoute>
          <Disconnected />
        </ProtectedRoute>)
      },
      {
        path: "/floors",
        element: (<ProtectedRoute>
          <Floors/>
        </ProtectedRoute>)
      },
      {
        path: "/POS/:table?/:uid?",
        element: (<ProtectedRoute>
          <POS/>
        </ProtectedRoute>)
      },
      {
        path: "/payment/:table_number?",
        element: (<ProtectedRoute>
          <Payment/>
        </ProtectedRoute>)
      },
      {
        path: "/orders",
        element: (<ProtectedRoute>
          <OrdersTable/>
        </ProtectedRoute>)
      }
    ],
  },
  
];

export default ThemeRoutes;
