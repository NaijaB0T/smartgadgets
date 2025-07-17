import type { APIRoute } from 'astro';
import { ProductService } from '../../../lib/services/product';

export const GET: APIRoute = async ({ params, locals }) => {
  try {
    const id = parseInt(params.id!);
    if (isNaN(id)) {
      return new Response(JSON.stringify({
        success: false,
        error: 'Invalid product ID'
      }), { status: 400 });
    }

    const productService = new ProductService(locals.runtime.env.DB);
    const product = await productService.getProductById(id);

    if (!product) {
      return new Response(JSON.stringify({
        success: false,
        error: 'Product not found'
      }), { status: 404 });
    }

    return new Response(JSON.stringify({
      success: true,
      data: product
    }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
      },
    });
  } catch (error) {
    console.error('Error fetching product:', error);
    return new Response(JSON.stringify({
      success: false,
      error: 'Failed to fetch product'
    }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
      },
    });
  }
};

export const PUT: APIRoute = async ({ params, request, locals }) => {
  try {
    // Verify authentication
    const authHeader = request.headers.get('Authorization');
    const token = authHeader?.replace('Bearer ', '') || authHeader?.replace('Token ', '');
    
    if (!token || token !== locals.runtime.env.API_TOKEN) {
      return new Response(JSON.stringify({
        success: false,
        error: 'Unauthorized'
      }), { status: 401 });
    }

    const id = parseInt(params.id!);
    if (isNaN(id)) {
      return new Response(JSON.stringify({
        success: false,
        error: 'Invalid product ID'
      }), { status: 400 });
    }

    const data = await request.json() as any;
    const productService = new ProductService(locals.runtime.env.DB);
    const product = await productService.updateProduct(id, data);

    if (!product) {
      return new Response(JSON.stringify({
        success: false,
        error: 'Product not found'
      }), { status: 404 });
    }

    return new Response(JSON.stringify({
      success: true,
      data: product
    }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
      },
    });
  } catch (error) {
    console.error('Error updating product:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to update product'
    }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
      },
    });
  }
};

export const DELETE: APIRoute = async ({ params, request, locals }) => {
  try {
    // Verify authentication
    const authHeader = request.headers.get('Authorization');
    const token = authHeader?.replace('Bearer ', '') || authHeader?.replace('Token ', '');
    
    if (!token || token !== locals.runtime.env.API_TOKEN) {
      return new Response(JSON.stringify({
        success: false,
        error: 'Unauthorized'
      }), { status: 401 });
    }

    const id = parseInt(params.id!);
    if (isNaN(id)) {
      return new Response(JSON.stringify({
        success: false,
        error: 'Invalid product ID'
      }), { status: 400 });
    }

    const productService = new ProductService(locals.runtime.env.DB);
    const success = await productService.deleteProduct(id);

    if (!success) {
      return new Response(JSON.stringify({
        success: false,
        error: 'Failed to delete product'
      }), { status: 500 });
    }

    return new Response(JSON.stringify({
      success: true,
      message: 'Product deleted successfully'
    }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
      },
    });
  } catch (error) {
    console.error('Error deleting product:', error);
    return new Response(JSON.stringify({
      success: false,
      error: 'Failed to delete product'
    }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
      },
    });
  }
};