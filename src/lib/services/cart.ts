export interface CartItem {
  id: number;
  name: string;
  price: number;
  quantity: number;
  image?: string;
  slug: string;
  max_quantity: number;
}

export interface Cart {
  items: CartItem[];
  total: number;
  item_count: number;
}

export class CartService {
  private storageKey = 'smartgadgets_cart';

  getCart(): Cart {
    if (typeof window === 'undefined') {
      return { items: [], total: 0, item_count: 0 };
    }

    try {
      const cartData = localStorage.getItem(this.storageKey);
      if (cartData) {
        const cart = JSON.parse(cartData);
        return this.calculateTotals(cart);
      }
    } catch (error) {
      console.error('Error loading cart:', error);
    }

    return { items: [], total: 0, item_count: 0 };
  }

  addItem(product: {
    id: number;
    name: string;
    price: number;
    image?: string;
    slug: string;
    stock_quantity: number;
  }, quantity: number = 1): Cart {
    const cart = this.getCart();
    const existingItemIndex = cart.items.findIndex(item => item.id === product.id);

    if (existingItemIndex > -1) {
      // Update existing item
      const currentQuantity = cart.items[existingItemIndex].quantity;
      const newQuantity = Math.min(currentQuantity + quantity, product.stock_quantity);
      cart.items[existingItemIndex].quantity = newQuantity;
    } else {
      // Add new item
      cart.items.push({
        id: product.id,
        name: product.name,
        price: product.price,
        quantity: Math.min(quantity, product.stock_quantity),
        image: product.image,
        slug: product.slug,
        max_quantity: product.stock_quantity
      });
    }

    const updatedCart = this.calculateTotals(cart);
    this.saveCart(updatedCart);
    return updatedCart;
  }

  updateQuantity(productId: number, quantity: number): Cart {
    const cart = this.getCart();
    const itemIndex = cart.items.findIndex(item => item.id === productId);

    if (itemIndex > -1) {
      if (quantity <= 0) {
        cart.items.splice(itemIndex, 1);
      } else {
        cart.items[itemIndex].quantity = Math.min(quantity, cart.items[itemIndex].max_quantity);
      }
    }

    const updatedCart = this.calculateTotals(cart);
    this.saveCart(updatedCart);
    return updatedCart;
  }

  removeItem(productId: number): Cart {
    const cart = this.getCart();
    cart.items = cart.items.filter(item => item.id !== productId);

    const updatedCart = this.calculateTotals(cart);
    this.saveCart(updatedCart);
    return updatedCart;
  }

  clearCart(): Cart {
    const emptyCart = { items: [], total: 0, item_count: 0 };
    this.saveCart(emptyCart);
    return emptyCart;
  }

  private calculateTotals(cart: Cart): Cart {
    const total = cart.items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const item_count = cart.items.reduce((sum, item) => sum + item.quantity, 0);

    return {
      ...cart,
      total,
      item_count
    };
  }

  private saveCart(cart: Cart): void {
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(this.storageKey, JSON.stringify(cart));
        
        // Update cart count in header
        const cartCountElement = document.getElementById('cart-count');
        if (cartCountElement) {
          cartCountElement.textContent = cart.item_count.toString();
        }

        // Dispatch custom event for cart updates
        window.dispatchEvent(new CustomEvent('cartUpdated', { detail: cart }));
      } catch (error) {
        console.error('Error saving cart:', error);
      }
    }
  }
}