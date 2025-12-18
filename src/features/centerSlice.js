import { createSlice } from "@reduxjs/toolkit";
import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";
import toast from "react-hot-toast";
import { Warning } from "../helpers/utils";

export const commonApiSlice = createApi({
	reducerPath: 'commonApi',
	baseQuery: fetchBaseQuery({
		baseUrl: process.env.REACT_APP_BACKEND_URI,
		prepareHeaders: (headers, { getState }) => {
			headers.set('Accept', 'application/json')
			headers.set('Content-Type', 'application/json')
			headers.set("asmara-token", localStorage.getItem('asmara-token'))
			headers.set("Authorization", `Bearer ${localStorage.getItem('asmara-token')}`)
			return headers
		}
	}),

	endpoints: builder => ({

		getNotifications: builder.query({
			query: () => {
				return {
					url: `/config/notifications`,
					method: "GET"
				}
			},
			async onQueryStarted(_, { dispatch, queryFulfilled }) {
				try {
					await queryFulfilled;
				} catch ({ error }) {
					const { status, data } = error
					if (status === 400 && data.message.indexOf('getaddrinfo') !== -1) {
						dispatch({ type: "NOT_CONNECTED" });
					}
				}
			}
		}),
		getTables: builder.query({
			query: () => ({
				url: '/tables',
			}),
			providesTags: ["Tables"],
			async onQueryStarted(_, { dispatch, queryFulfilled }) {
				try {
					await queryFulfilled;
				} catch ({ error }) {
					const { status, data } = error
					if (status === 400 && data.message.indexOf('getaddrinfo') !== -1) {
						dispatch({ type: "NOT_CONNECTED" });
					}
				}
			}
		}),
		getReservations: builder.query({
			query: () => `/tables/reservations`,
			invalidatesTags: ['Tables'],
			async onQueryStarted(_, {dispatch, queryFulfilled}) {
				try {
					const {data} = await queryFulfilled
					if(data.status) {
						dispatch({
							type: "SET_RESERVATIONS",
							payload: data.reservations
						});
					}
				} catch (error) {
					console.log(error.message);	
				}
			}
		}),
		initOrder: builder.mutation({
			query: (table_number) => `/orders/init/${table_number}`,
			invalidatesTags: ['Tables', 'Order'],
			async onQueryStarted(_, { dispatch, queryFulfilled }) {
				try {
					const { data } = await queryFulfilled;
					dispatch({
						type: "ORDERS_AND_TABLE",
						payload: data.order
					});

				} catch (error) {
					let msg = error.error?.data
					if (msg?.message) {
						toast.error(msg.message);
					}
				}
			}
		}),
		zReport: builder.mutation({
			query: ({ payload }) => ({
				url: '/orders/z-report',
				method: "POST",
				body: payload
			}),
			invalidatesTags: ['Tables', "Order"],
			async onQueryStarted(_, { dispatch, queryFulfilled }) {
				try {
					const { data } = await queryFulfilled;
					if (data.status) {

						if (window.electronAPI)
							window.electronAPI.printReport(data.html)
						else
							Warning("Printer not connected!");

						localStorage.setItem('cartSessions', '[1]');
						dispatch({ type: "RESET_KART" });
						dispatch({ type: "DAY_CLOSE" })
						toast.success(data.message)

					} else {
						toast.error(data.message);
					}
					dispatch({ type: "STOP_LOADING" });

				} catch (error) {
					toast.error(error.message)
				}
			}

		}),
		makePayment: builder.mutation({
			query: payload => ({
				url: `/orders/create`,
				method: "POST",
				body: payload
			}),
			invalidatesTags: ['Tables', 'Order'],
			async onQueryStarted(_, { dispatch, queryFulfilled }) {
				try {
					const { data } = await queryFulfilled;
					console.log(data);
				} catch (error) {
					console.error("❌ Error:", error);
				}
			}
		}),
		makeOrder: builder.mutation({
			query: ({ id, body }) => ({
				url: `/orders/to-kitchen/${id}`,
				method: 'POST',
				body
			}),
			invalidatesTags: ['Order', 'Tables'],
			async onQueryStarted(_, { dispatch, queryFulfilled }) {
				try {
					await queryFulfilled;
				} catch (error) {

				}
			}
		}),
		updateTablePosition: builder.mutation({
			query: ({ table, body }) => ({
				url: `/tables/update-position/${table}`,
				method: "POST",
				body
			}),
			invalidatesTags: ["Tables"],
			async onQueryStarted({ table, body }, { dispatch, queryFulfilled }) {
				// 🔥 Optimistically update cache
				const patchResult = dispatch(
					commonApiSlice.util.updateQueryData('getTables', undefined, (draft) => {
						const foundTable = draft.tables.find(t => t.table_number === table);
						if (foundTable) {
							foundTable.x = body.x;
							foundTable.y = body.y;
						}
					})
				);

				try {
					await queryFulfilled;
				} catch {
					// rollback if server fails
					patchResult.undo();
				}
			},
		}),
		cancelOrder: builder.mutation({
			query: ({ order, table }) => `orders/cancel/${order}/${table}`,
			invalidatesTags: ['Tables', 'Order'],
			async onQueryStarted(_, { dispatch, queryFulfilled }) {
				try {
					const { data } = await queryFulfilled
					if (data.status) {
						toast.success(data.message)
					} else {
						toast.error(data.message);
					}

				} catch (error) {

				}
			}
		}),
		mergeTable: builder.mutation({
			query: ({ t1, t2 }) => ({
				url: `/orders/link/${t1}/${t2}`,
			}),

			async onQueryStarted({ mergedTable, draggedId, targetId }, { dispatch, queryFulfilled }) {

				const patch = dispatch(
					commonApiSlice.util.updateQueryData('getTables', undefined, (draft) => {
						// remove both tables
						draft.tables = draft.tables.filter(
							t => t.id !== draggedId && t.id !== targetId
						);
						console.log(mergedTable, draggedId, targetId)
						// add merged table
						draft.tables.push(mergedTable);
					})
				);

				try {
					await queryFulfilled;
				} catch {
					patch.undo(); // rollback on failure
				}
			},

			invalidatesTags: ['Tables'], // optional but recommended
		}),

		splitTable: builder.mutation({
			query: ({ table_number }) => `tables/split-table/${table_number}`,
			invalidatesTags: ['Tables','Order'],
			async onQueryStarted(_, { dispatch, queryFulfilled }) {
				try {
					const { data } = await queryFulfilled
					if (data.status) {
						toast.success(data.message)
					} else {
						toast.error(data.message);
					}

				} catch (error) {

				}
			}
		}),
		finishOrder: builder.mutation({
			query: ({ order, table }) => `orders/finish/${order}/${table}`,
			invalidatesTags: ['Tables', 'Order'],
			async onQueryStarted(_, { dispatch, queryFulfilled }) {
				try {
					const { data } = await queryFulfilled;
					if (data.status) {
						toast.success(data.message)
					} else {
						toast.error(data.message);
					}

				} catch (error) { }
			}
		}),
		digSession: builder.mutation({
			query: ({ order }) => `orders/info/${order}`,
			invalidatesTags: ['Tables', 'Order'],
			async onQueryStarted(_, { dispatch, queryFulfilled }) {
				try {
					const { data } = await queryFulfilled;
					if (data.status) {
						if (data.order.status !== 'completed') {
							dispatch({
								type: "APPEND_CART",
								payload: {
									table: data.table,
									products: data.products
								}
							});
						} else {
							dispatch({
								type: "UNSET_ORDER",
								payload: data.order.tables
							});
						}
						
						window.electronAPI?.sendToKitchen({ 
							tableName: data.table,
							taste: data.order.taste,
							note: data.order.note,
							products: data.products,
							printer: localStorage.getItem('__asmara_kitchen_printer')
						});

					}
				} catch (error) { toast.error("something went wrong while bringing session data!") }
			}
		}),
		getOrders: builder.query({
			query: () => 'orders',
			providesTags: ["Order"],
			async onQueryStarted(_, { dispatch, queryFulfilled }) {
				try {
					const { data } = await queryFulfilled;
					if (data.status) {
						dispatch({
							type: "TABLE_ORDERS_BULK",
							payload: data.tableOrders
						});
					}
				} catch ({ error }) {
					const { status, data } = error;
					if (status === 400 && data.message.indexOf('getaddrinfo') !== -1) {
						dispatch({ type: "NOT_CONNECTED" });
					}
				}
			}
		}),
		getMenus: builder.query({
			query: () => {
				return {
					url: `/menu`,
					method: 'GET',
				}
			},
			async onQueryStarted(_, { dispatch, queryFulfilled }) {
				try {
					const { data } = await queryFulfilled;
					if (data.status) {
						dispatch({
							type: "CATEGORIES",
							payload: data.categories
						})
					}
				} catch ({ error }) {
					const { status, data } = error;
					console.log("error hai", status, data)
					if (status === 400 && data.message.indexOf('getaddrinfo') !== -1) {
						// dispatch ho rha
						// Navigate('/disconnected')
						dispatch({ type: "NOT_CONNECTED" })
					}
				}
			}
		}),
		getListMenu: builder.query({
			query: () => {
				return {
					url: `/category?list=true`,
					method: 'GET'
				}
			},
			async onQueryStarted(_, { dispatch, queryFulfilled }) {
				try {
					const { data } = await queryFulfilled;
					console.log(data)
				} catch ({ error }) {
					const { status, data } = error
					if (status === 400 && data.message.indexOf('getaddrinfo') !== -1) {
						dispatch({ type: "NOT_CONNECTED" });
					}
				}
			}
		}),
		deleteMenu: builder.mutation({
			query: ({ id }) => {
				return {
					url: `menu/remove/${id}`,
					method: `GET`
				}
			},
			async onQueryStarted(args, { dispatch, queryFulfilled }) {
				try {
					const { data } = await queryFulfilled;
					if (data.status) {
						toast.success(data.message)
					} else {
						toast.error(data.message)
					}
					dispatch(
						commonApiSlice.util.updateQueryData('getPosItems', undefined, (draft) => {
							const { products } = draft;
							if (data.status) {
								if (products) {
									draft['products'] = products.filter(item => parseInt(item.category_id) !== parseInt(args.id))
								}
							}
						})
					)
				} catch (error) {
					console.log("Exception occurred :- " + error);
				}
			}
		}),
		toggleMenu: builder.mutation({
			query: ({ id, status }) => `/menu/toggle/${id}/${status}`,
			async onQueryStarted(args, { dispatch, queryFulfilled }) {
				try {
					const { data } = await queryFulfilled; // Wait for the mutation to succeed
					if (data.status) {
						toast.success(data.message)
					} else {
						toast.error(data.message);
					}
					dispatch(
						commonApiSlice.util.updateQueryData('getMenus', undefined, (draft) => {
							draft['menu'] = draft.menu.map(cat => cat.id === parseInt(args.id) ? data.category : cat)
						})
					);

					dispatch(
						commonApiSlice.util.updateQueryData('getPosItems', undefined, draft => {
							draft['products'] = draft.products.map(item => {
								if (item.category_id === parseInt(data.category.id)) {
									item.pos = data.category.status;
								}
								return item;
							})
						})
					)


				} catch (error) {
					console.error('Failed to update cache:', error);
				}
			}
		}),
		getTaxes: builder.query({
			query: () => ({
				url: 'tax/list',
				method: 'GET'
			}),
			async onQueryStarted(_, { dispatch, queryFulfilled }) {
				try {

				} catch ({ error }) {
					const { status, data } = error;
					if (status === 400 && data.message.indexOf('getaddrinfo') !== -1) {
						dispatch({ type: "NOT_CONNECTED" })
					}
				}
			}
		}),
		toggleTax: builder.mutation({
			query: ({ id, status }) => {
				return {
					url: `/tax/toggle/${id}/${status}`,
					method: "GET"
				}
			},
			async onQueryStarted(args, { dispatch, queryFulfilled }) {
				try {
					const { data } = await queryFulfilled; // Wait for the mutation to succeed
					if (data.status) {
						toast.success(data.message)
					} else {
						toast.error(data.message);
					}
					dispatch(
						commonApiSlice.util.updateQueryData('getTaxes', undefined, (draft) => {
							// console.log(JSON.stringify(draft))
							draft['taxes'] = draft.taxes.map(cat => cat.id === parseInt(args.id) ? data.tax : cat)
							// const {products} = draft;
							// const {updated} = args;
							// const index = products.findIndex((item) => item.id === updated.id);
							// if (index !== -1) draft['products'][index] = updated; // Update the item in the cache
						})
					);

				} catch (error) {
					console.error('Failed to update cache:', error);
				}
			}
		}),
		getItems: builder.query({
			query: () => `/items`,
			async onQueryStarted(args, { dispatch, queryFulfilled }) {
				try {
					const { data } = await queryFulfilled;
					if (!data.status && data.relaunch) {
						window.electronAPI?.relaunch()
					}
				} catch ({ error }) {
					const { status, data } = error
					if (status === 400 && data.message.indexOf('getaddrinfo') !== -1) { // .indexOf('getaddrinfo') !== -1
						dispatch({ type: "NOT_CONNECTED" })
					}
				}
			}
		}),
		getPosItems: builder.query({
			query: () => `/pos/items`,
			async onQueryStarted(args, { dispatch, queryFulfilled }) {
				try {
					const { data } = await queryFulfilled;
					if (!data.status && data.relaunch) {
						window.electronAPI?.relaunch();
					}
				} catch ({ error }) {
					const { status, data } = error;
					if (status === 401) {
						dispatch({ type: "LOGOUT" });
					}
					if (status === 400 && data.message.indexOf('getaddrinfo') !== -1) {
						dispatch({ type: "NOT_CONNECTED" });
					}
				}
			}
		}),
		updateItem: builder.mutation({
			query: (fd) => ({
				url: `/item/update`,
				method: 'POST',
				headers: {
					"Accept": "application/json",
					"Content-Type": "multipart/form-data",
					"asmara-token": localStorage.getItem('asmara-token')
				},
				body: fd
			}),
			async onQueryStarted(_, { dispatch, queryFulfilled }) {
				try {
					await queryFulfilled;
				} catch ({ error }) {
					const { status, data } = error
					if (status === 400 && data.message.indexOf('getaddrinfo') !== -1) {
						dispatch({ type: "NOT_CONNECTED" });
					}
				}
			}
		}),
		togglePOS: builder.mutation({
			query: ({ id, status }) => ({
				url: `/products/update-product-pos/${id}/${status}`,
				method: "GET"
			}),
			async onQueryStarted(args, { dispatch, queryFulfilled }) {
				try {
					const { data } = await queryFulfilled;

					if (data.status) {
						toast.success("POS status updated!")
					} else {
						toast.error("Something went wrong");
					}
					dispatch(
						commonApiSlice.util.updateQueryData('getProducts', undefined, (draft) => {
							const { products } = draft;
							draft['products'] = products.map(item => {
								if (item.id === parseInt(args.id)) {
									item.pos = args.status
								}
								return item
							})
						})
					);

					dispatch(
						commonApiSlice.util.updateQueryData('getPosItems', undefined, draft => {
							const { products } = draft;
							if (products) {
								if (args.status === 0) {
									draft['products'] = products.filter(item => item.id !== parseInt(args.id))
								} else {
									draft['products'].push(data.product)
								}
							}
						})
					)

				} catch ({ error }) {
					console.log(`Exception occurred:- ${error.message}`);
					const { status, data } = error;
					if (status === 400 && data.message.indexOf('getaddrinfo') !== -1) { // .indexOf('getaddrinfo') !== -1
						dispatch({ type: "NOT_CONNECTED" })
					}
				}
			}
		}),
		deleteProduct: builder.mutation({
			query: ({ id }) => ({
				url: `/products/remove/${id}`,
				method: "GET",
			}),
			async onQueryStarted(args, { queryFulfilled, dispatch }) {
				try {
					const { data } = await queryFulfilled;
					if (data.status) {
						if (data.disconnected) {
							Warning("Product not deleted on phone due to internet!")
						}
						if (!data.data.status) {
							toast("Product not removed from mobile, Since the application key is not registered! Sync the products to register!",
								{
									icon: '⚠️',
									style: {
										borderRadius: '10px',
										background: '#333',
										color: '#fff',
									},
									duration: 9999
								}
							);
						}
						toast.success(data.message)
					} else {
						toast.error(data.message)
					}

					dispatch(
						commonApiSlice.util.updateQueryData('getProducts', undefined, (draft) => {
							let { products } = draft
							if (products) {
								draft['products'] = products?.filter(product => product?.id !== parseInt(args.id))
							}
						})
					)
					dispatch(
						commonApiSlice.util.updateQueryData('getPosItems', undefined, draft => {
							let { products } = draft;
							if (products) {
								draft['products'] = products.filter(item => item.id !== parseInt(args.id))
							}
						})
					)
				} catch ({ error }) {
					const { status, data } = error;
					if (status === 400 && data.message.indexOf('getaddrinfo') !== -1) { // .indexOf('getaddrinfo') !== -1
						dispatch({ type: "NOT_CONNECTED" })
					}
				}
			}
		}),
		getCustomers: builder.query({
			query: () => `/pos/customers`
		}),
		getSettings: builder.query({
			query: () => ({
				url: `/config/settings`,
				method: 'GET'
			}),
			async onQueryStarted(_, { dispatch, queryFulfilled }) {
				try {
					await queryFulfilled;
				} catch ({ error }) {
					const { status, data } = error
					if (status === 400 && data.message.indexOf('getaddrinfo') !== -1) {
						dispatch({ type: "NOT_CONNECTED" });
					}
				}
			}
		})
	})
})

const initialState = {
	loading: true,
	data: [],
	error: ''
}

const centerSlice = createSlice({
	name: 'api',
	initialState,
	reducers: {
		updateItem(state, action) {
			const { id, data } = action.payload;
			const item = state.items.find(item => item.id === id);
			if (item) {
				Object.assign(item, data); // Update the item with new data
			}
		},
	},

})

export default centerSlice.reducer

export const {
	useGetMenusQuery,
	useGetProductsQuery,
	useGetPosItemsQuery,
	useGetListCategoriesQuery,
	useGetTablesQuery,
	useUpdateProductMutation,
	useFinishOrderMutation,
	useUpdateTablePositionMutation,
	useDeleteProductMutation,
	useTogglePOSMutation,
	useGetTaxesQuery,
	useToggleCategoryMutation,
	useMergeTableMutation,
	useInitOrderMutation,
	useMakeOrderMutation,
	useCancelOrderMutation,
	useMakePaymentMutation,
	useDigSessionMutation,
	useToggleTaxMutation,
	useGetNotificationsQuery,
	useGetSettingsQuery,
	useGetOrdersQuery,
	useGetCustomersQuery,
	useZReportMutation,
	useSplitTableMutation
} = commonApiSlice;

export const { updateItem } = centerSlice.actions;