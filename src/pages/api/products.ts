import type { APIRoute } from 'astro';
import { ProductService } from '../../lib/services/product';

export const GET: APIRoute = async ({ request, locals }) => {
  try {
    const url = new URL(request.url);
    const category = url.searchParams.get('category') || undefined;
    const status = url.searchParams.get('status') || 'active';
    const featured = url.searchParams.get('featured') === 'true' ? true : undefined;
    const search = url.searchParams.get('search') || undefined;
    const limit = url.searchParams.get('limit') ? parseInt(url.searchParams.get('limit')!) : 20;
    const page = url.searchParams.get('page') ? parseInt(url.searchParams.get('page')!) : 1;
    const offset = (page - 1) * limit;

    const productService = new ProductService(locals.runtime.env.DB);
    const result = await productService.getAllProducts({
      category,
      status,
      featured,
      search,
      limit,
      offset
    });

    return new Response(JSON.stringify({
      success: true,
      data: result.products,
      pagination: {
        page,
        limit,
        total: result.total,
        total_pages: Math.ceil(result.total / limit)
      }
    }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
      },
    });
  } catch (error) {
    console.error('Error fetching products:', error);
    return new Response(JSON.stringify({
      success: false,
      error: 'Failed to fetch products'
    }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
      },
    });
  }
};

export const POST: APIRoute = async ({ request, locals }) => {
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

    const data = await request.json() as any;
    
    // Validate required fields
    if (!data.name || !data.slug || data.price === undefined) {
      return new Response(JSON.stringify({
        success: false,
        error: 'Missing required fields: name, slug, price'
      }), { status: 400 });
    }

    const productService = new ProductService(locals.runtime.env.DB);
    const product = await productService.createProduct(data);

    return new Response(JSON.stringify({
      success: true,
      data: product
    }), {
      status: 201,
      headers: {
        'Content-Type': 'application/json',
      },
    });
  } catch (error) {
    console.error('Error creating product:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to create product'
    }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
      },
    });
  }
};