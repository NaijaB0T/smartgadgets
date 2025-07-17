import React, { useState, useEffect } from 'react';
import { useForm, useFieldArray, type SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '../ui/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select';
import { Checkbox } from '../ui/checkbox';
import { Plus, X } from 'lucide-react';

const productSchema = z.object({
  name: z.string().min(1, 'Product name is required'),
  slug: z.string().min(1, 'URL slug is required'),
  description: z.string().optional(),
  short_description: z.string().optional(),
  price: z.number().min(0, 'Price must be positive'),
  compare_at_price: z.number().optional(),
  sku: z.string().optional(),
  category_id: z.number().optional(),
  brand: z.string().optional(),
  model: z.string().optional(),
  stock_quantity: z.number().min(0, 'Stock must be non-negative'),
  featured_image: z.string().url().optional().or(z.literal('')),
  gallery_images: z.array(z.string().url()).optional(),
  status: z.enum(['active', 'inactive', 'out_of_stock', 'discontinued']),
  is_featured: z.boolean(),
  weight: z.number().optional(),
  attributes: z.array(z.object({
    name: z.string().min(1),
    value: z.string().min(1),
    sort_order: z.number().default(0),
  })).optional(),
});

type ProductFormData = z.infer<typeof productSchema>;

interface Category {
  id: number;
  name: string;
}

interface Product {
  id: number;
  name: string;
  slug: string;
  description?: string;
  short_description?: string;
  price: number;
  compare_at_price?: number;
  sku?: string;
  category_id?: number;
  brand?: string;
  model?: string;
  stock_quantity: number;
  featured_image?: string;
  gallery_images?: string[];
  status: 'active' | 'inactive' | 'out_of_stock' | 'discontinued';
  is_featured: boolean;
  weight?: number;
  attributes?: Array<{
    name: string;
    value: string;
    sort_order: number;
  }>;
}

interface EditProductProps {
  product: string;
  apiToken: string;
}

export function EditProduct({ product: productString, apiToken }: EditProductProps) {
  let product: Product;
  try {
    product = JSON.parse(productString) as Product;
    console.log('Parsed product:', product);
  } catch (error) {
    console.error('Failed to parse product:', error);
    return <div className="p-4 text-red-600">Error: Invalid product data</div>;
  }
  
  const [loading, setLoading] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  
  // Handle gallery_images - it might be a string or array
  const parseGalleryImages = (images: any): string[] => {
    if (!images) return [''];
    if (typeof images === 'string') {
      try {
        const parsed = JSON.parse(images);
        return Array.isArray(parsed) ? parsed : [''];
      } catch {
        return images.split(',').map(img => img.trim()).filter(Boolean);
      }
    }
    return Array.isArray(images) ? images : [''];
  };
  
  const [galleryImages, setGalleryImages] = useState<string[]>(parseGalleryImages(product.gallery_images));

  // Handle attributes - convert from ProductAttribute to form format
  const parseAttributes = (attrs: any): Array<{name: string, value: string, sort_order: number}> => {
    if (!attrs || !Array.isArray(attrs)) return [];
    return attrs.map(attr => ({
      name: attr.attribute_name || attr.name || '',
      value: attr.attribute_value || attr.value || '',
      sort_order: attr.sort_order || 0
    }));
  };

  const form = useForm<ProductFormData>({
    resolver: zodResolver(productSchema) as any,
    defaultValues: {
      name: product.name || '',
      slug: product.slug || '',
      description: product.description || '',
      short_description: product.short_description || '',
      price: product.price ? product.price / 100 : 0, // Convert from cents to dollars
      compare_at_price: product.compare_at_price ? product.compare_at_price / 100 : 0,
      sku: product.sku || '',
      category_id: product.category_id || undefined,
      brand: product.brand || '',
      model: product.model || '',
      stock_quantity: product.stock_quantity || 0,
      featured_image: product.featured_image || '',
      gallery_images: parseGalleryImages(product.gallery_images),
      status: product.status || 'active',
      is_featured: product.is_featured || false,
      weight: product.weight || 0,
      attributes: parseAttributes((product as any).attributes),
    },
  });

  const { fields: attributeFields, append: appendAttribute, remove: removeAttribute } = useFieldArray({
    control: form.control,
    name: 'attributes',
  });

  // Auto-generate slug from name
  const generateSlug = (name: string) => {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
  };

  // Watch name field to auto-generate slug
  const watchName = form.watch('name');
  useEffect(() => {
    if (watchName) {
      const slug = generateSlug(watchName);
      form.setValue('slug', slug);
    }
  }, [watchName, form]);

  // Fetch categories
  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const response = await fetch('/api/categories', {
          headers: {
            'Authorization': `Bearer ${apiToken}`,
          },
        });
        if (response.ok) {
          const result = await response.json();
          if (result.success) {
            setCategories(result.data);
          }
        }
      } catch (error) {
        console.error('Error fetching categories:', error);
      }
    };

    fetchCategories();
  }, [apiToken]);

  const onSubmit: SubmitHandler<ProductFormData> = async (data) => {
    setLoading(true);
    try {
      // Convert price back to cents
      const productData = {
        ...data,
        price: Math.round(data.price * 100),
        compare_at_price: data.compare_at_price ? Math.round(data.compare_at_price * 100) : null,
        gallery_images: galleryImages.filter(img => img.trim() !== ''),
      };

      const response = await fetch(`/api/products/${product.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiToken}`,
        },
        body: JSON.stringify(productData),
      });

      if (response.ok) {
        // Success: reload the page to show updated data
        window.location.reload();
      } else {
        const errorData = await response.json();
        alert(`Error: ${errorData.message || 'Failed to update product'}`);
      }
    } catch (error) {
      console.error('Error updating product:', error);
      alert('Error updating product');
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    // Hide edit form and show product details
    const editForm = document.getElementById('edit-form');
    const productDetails = document.getElementById('product-details');
    const editToggle = document.getElementById('edit-toggle');
    
    if (editForm) editForm.classList.add('hidden');
    if (productDetails) productDetails.classList.remove('hidden');
    if (editToggle) editToggle.textContent = 'Edit Product';
  };

  const addGalleryImage = () => {
    setGalleryImages([...galleryImages, '']);
  };

  const removeGalleryImage = (index: number) => {
    setGalleryImages(galleryImages.filter((_, i) => i !== index));
  };

  const updateGalleryImage = (index: number, value: string) => {
    const newImages = [...galleryImages];
    newImages[index] = value;
    setGalleryImages(newImages);
    form.setValue('gallery_images', newImages.filter(img => img.trim() !== ''));
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        {/* Basic Information */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Product Name</FormLabel>
                <FormControl>
                  <Input placeholder="Enter product name" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="slug"
            render={({ field }) => (
              <FormItem>
                <FormLabel>URL Slug</FormLabel>
                <FormControl>
                  <Input placeholder="product-url-slug" {...field} />
                </FormControl>
                <FormDescription>
                  This will be used in the product URL
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {/* Descriptions */}
        <FormField
          control={form.control}
          name="short_description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Short Description</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="Brief description for product listings"
                  className="resize-none"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Full Description</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="Detailed product description"
                  className="resize-none"
                  rows={4}
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Pricing */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="price"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Price ($)</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    {...field}
                    onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="compare_at_price"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Compare at Price ($)</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    {...field}
                    onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                  />
                </FormControl>
                <FormDescription>
                  Original price before discount (optional)
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {/* Product Details */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <FormField
            control={form.control}
            name="sku"
            render={({ field }) => (
              <FormItem>
                <FormLabel>SKU</FormLabel>
                <FormControl>
                  <Input placeholder="Product SKU" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="brand"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Brand</FormLabel>
                <FormControl>
                  <Input placeholder="Brand name" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="model"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Model</FormLabel>
                <FormControl>
                  <Input placeholder="Model number" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {/* Inventory & Category */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <FormField
            control={form.control}
            name="stock_quantity"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Stock Quantity</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    min="0"
                    {...field}
                    onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="weight"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Weight (grams)</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    min="0"
                    {...field}
                    onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="category_id"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Category</FormLabel>
                <Select onValueChange={(value) => field.onChange(parseInt(value))} value={field.value?.toString()}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a category" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {categories.map((category) => (
                      <SelectItem key={category.id} value={category.id.toString()}>
                        {category.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {/* Status & Featured */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="status"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Status</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select status" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                    <SelectItem value="out_of_stock">Out of Stock</SelectItem>
                    <SelectItem value="discontinued">Discontinued</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="is_featured"
            render={({ field }) => (
              <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                <FormControl>
                  <Checkbox
                    checked={field.value}
                    onCheckedChange={field.onChange}
                  />
                </FormControl>
                <div className="space-y-1 leading-none">
                  <FormLabel>Featured Product</FormLabel>
                  <FormDescription>
                    Featured products appear on the homepage
                  </FormDescription>
                </div>
              </FormItem>
            )}
          />
        </div>

        {/* Images */}
        <FormField
          control={form.control}
          name="featured_image"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Featured Image URL</FormLabel>
              <FormControl>
                <Input
                  placeholder="https://example.com/image.jpg"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Gallery Images */}
        <div className="space-y-4">
          <Label>Gallery Images</Label>
          {galleryImages.map((image, index) => (
            <div key={index} className="flex gap-2">
              <Input
                placeholder="https://example.com/image.jpg"
                value={image}
                onChange={(e) => updateGalleryImage(index, e.target.value)}
                className="flex-1"
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => removeGalleryImage(index)}
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          ))}
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={addGalleryImage}
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Gallery Image
          </Button>
        </div>

        {/* Product Attributes */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <Label>Product Attributes</Label>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => appendAttribute({ name: '', value: '', sort_order: 0 })}
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Attribute
            </Button>
          </div>

          {attributeFields.map((field, index) => (
            <div key={field.id} className="flex gap-2">
              <FormField
                control={form.control}
                name={`attributes.${index}.name`}
                render={({ field }) => (
                  <FormItem className="flex-1">
                    <FormControl>
                      <Input placeholder="Attribute name" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name={`attributes.${index}.value`}
                render={({ field }) => (
                  <FormItem className="flex-1">
                    <FormControl>
                      <Input placeholder="Attribute value" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => removeAttribute(index)}
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          ))}
        </div>

        {/* Submit Buttons */}
        <div className="flex justify-end space-x-2">
          <Button
            type="button"
            variant="outline"
            onClick={handleCancel}
            disabled={loading}
          >
            Cancel
          </Button>
          <Button type="submit" disabled={loading}>
            {loading ? 'Updating...' : 'Update Product'}
          </Button>
        </div>
      </form>
    </Form>
  );
}