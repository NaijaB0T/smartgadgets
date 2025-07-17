import type { APIRoute } from 'astro';
import { CategoryService } from '../../lib/services/category';

export const GET: APIRoute = async ({ request, locals }) => {
  try {
    const url = new URL(request.url);
    const includeInactive = url.searchParams.get('include_inactive') === 'true';

    const categoryService = new CategoryService(locals.runtime.env.DB);
    const categories = await categoryService.getAllCategories(includeInactive);

    return new Response(JSON.stringify({
      success: true,
      data: categories
    }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
      },
    });
  } catch (error) {
    console.error('Error fetching categories:', error);
    return new Response(JSON.stringify({
      success: false,
      error: 'Failed to fetch categories'
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

    const data = await request.json();
    
    // Validate required fields
    if (!data.name || !data.slug) {
      return new Response(JSON.stringify({
        success: false,
        error: 'Missing required fields: name, slug'
      }), { status: 400 });
    }

    const categoryService = new CategoryService(locals.runtime.env.DB);
    const category = await categoryService.createCategory(data);

    return new Response(JSON.stringify({
      success: true,
      data: category
    }), {
      status: 201,
      headers: {
        'Content-Type': 'application/json',
      },
    });
  } catch (error) {
    console.error('Error creating category:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to create category'
    }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
      },
    });
  }
};