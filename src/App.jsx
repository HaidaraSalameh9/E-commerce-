
import { Route, Routes, useLocation } from 'react-router';
import Home from './Page/Home';

import Navbar from './components/Navbar';
import Products from './Page/Products';
import Cart from './Page/Cart';
import ProductDetails from './Page/ProductDetails';
import Footer from './components/Footer';
import Contact from './Page/Contact';
import About from './Page/About';
import Checkout from './Page/Checkout';
import OrderConfirm from './Page/OrderConfirm';
import { useState } from 'react';
import Favorite from './Page/Favorite';
import ScrollButtons from './components/ScrollButtons';

const App = () => {

  const isCard = useLocation().pathname.includes("cart");
  const [order, setOrder] = useState(null);
  const [address, setAddress] = useState("main street, 0012");

  return (
    <div className='px-4' >
      {/* {!isCard && <Navbar />} */}
      <Navbar />
      <div className={`min-h-[72vh] mt-30 pt-2 px-4 pb-5 container mx-auto bg-gray-100 rounded`}>
        <Routes>
          <Route path='/' element={<Home />} />
          <Route path='/products' element={<Products />} />
          <Route path='/favorite' element={<Favorite />} />
          <Route path='/contact' element={<Contact />} />
          <Route path='/about' element={<About />} />
          <Route path='/productDetails/:id' element={<ProductDetails />} />
          <Route path='/cart' element={<Cart address={address} setAddress={setAddress} />} />
          <Route path='/checkout' element={<Checkout setOrder={setOrder} address={address} />} />
          <Route path='/order-confirmation' element={<OrderConfirm order={order} />} />
        </Routes>
      </div>
      <Footer />
      <ScrollButtons />
    </div>
  );
};

export default App;