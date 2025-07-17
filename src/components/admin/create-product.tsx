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

interface CreateProductProps {
  apiToken: string;
  onSuccess: () => void;
}

export function CreateProduct({ apiToken, onSuccess }: CreateProductProps) {
  const [loading, setLoading] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const [galleryImages, setGalleryImages] = useState<string[]>(['']);

  const form = useForm<ProductFormData>({
    resolver: zodResolver(productSchema) as any,
    defaultValues: {
      name: '',
      slug: '',
      description: '',
      short_description: '',
      price: 0,
      compare_at_price: 0,
      sku: '',
      category_id: undefined,
      brand: '',
      model: '',
      stock_quantity: 0,
      featured_image: '',
      gallery_images: [],
      status: 'active',
      is_featured: false,
      weight: 0,
      attributes: [],
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
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .trim('-');
  };

  const handleNameChange = (value: string) => {
    form.setValue('name', value);
    if (!form.getValues('slug')) {
      form.setValue('slug', generateSlug(value));
    }
  };

  const addGalleryImage = () => {
    setGalleryImages([...galleryImages, '']);
  };

  const removeGalleryImage = (index: number) => {
    const newImages = galleryImages.filter((_, i) => i !== index);
    setGalleryImages(newImages);
    form.setValue('gallery_images', newImages.filter(img => img.trim() !== ''));
  };

  const updateGalleryImage = (index: number, value: string) => {
    const newImages = [...galleryImages];
    newImages[index] = value;
    setGalleryImages(newImages);
    form.setValue('gallery_images', newImages.filter(img => img.trim() !== ''));
  };

  const fetchCategories = async () => {
    try {
      const response = await fetch('/api/categories');
      if (response.ok) {
        const result = await response.json() as any;
        if (result.success) {
          setCategories(result.data);
        }
      }
    } catch (error) {
      console.error('Error fetching categories:', error);
    }
  };

  const onSubmit: SubmitHandler<ProductFormData> = async (data) => {
    try {
      setLoading(true);
      
      // Convert price from dollars to cents
      const productData = {
        ...data,
        price: Math.round(data.price * 100),
        compare_at_price: data.compare_at_price ? Math.round(data.compare_at_price * 100) : undefined,
        gallery_images: galleryImages.filter(img => img.trim() !== ''),
      };

      const response = await fetch('/api/products', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiToken}`,
        },
        body: JSON.stringify(productData),
      });

      if (!response.ok) {
        const error = await response.json() as any;
        throw new Error(error.error || 'Failed to create product');
      }

      onSuccess();
    } catch (error) {
      console.error('Error creating product:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to create product';
      alert(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCategories();
  }, []);

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit as any)} className="space-y-6 max-h-[70vh] overflow-y-auto">
        {/* Basic Information */}
        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control as any}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Product Name</FormLabel>
                <FormControl>
                  <Input
                    {...field}
                    onChange={(e) => handleNameChange(e.target.value)}
                    placeholder="iPhone 15 Pro"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          
          <FormField
            control={form.control as any}
            name="slug"
            render={({ field }) => (
              <FormItem>
                <FormLabel>URL Slug</FormLabel>
                <FormControl>
                  <Input {...field} placeholder="iphone-15-pro" />
                </FormControl>
                <FormDescription>
                  Used in the product URL
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="short_description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Short Description</FormLabel>
              <FormControl>
                <Textarea 
                  {...field} 
                  placeholder="Brief product description for listings"
                  rows={2}
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
                  {...field} 
                  placeholder="Detailed product description"
                  rows={4}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Pricing */}
        <div className="grid grid-cols-3 gap-4">
          <FormField
            control={form.control as any}
            name="price"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Price ($)</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    step="0.01"
                    {...field}
                    onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                    placeholder="299.99"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          
          <FormField
            control={form.control as any}
            name="compare_at_price"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Compare Price ($)</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    step="0.01"
                    {...field}
                    onChange={(e) => field.onChange(parseFloat(e.target.value) || undefined)}
                    placeholder="399.99"
                  />
                </FormControl>
                <FormDescription>
                  Original price for discounts
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control as any}
            name="stock_quantity"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Stock Quantity</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    {...field}
                    onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                    placeholder="50"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {/* Product Details */}
        <div className="grid grid-cols-3 gap-4">
          <FormField
            control={form.control as any}
            name="sku"
            render={({ field }) => (
              <FormItem>
                <FormLabel>SKU</FormLabel>
                <FormControl>
                  <Input {...field} placeholder="IPH15P-128-BLK" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control as any}
            name="brand"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Brand</FormLabel>
                <FormControl>
                  <Input {...field} placeholder="Apple" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control as any}
            name="model"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Model</FormLabel>
                <FormControl>
                  <Input {...field} placeholder="iPhone 15 Pro" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {/* Category and Status */}
        <div className="grid grid-cols-3 gap-4">
          <FormField
            control={form.control as any}
            name="category_id"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Category</FormLabel>
                <Select onValueChange={(value) => field.onChange(parseInt(value))}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select category" />
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

          <FormField
            control={form.control as any}
            name="status"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Status</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue />
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
            control={form.control as any}
            name="weight"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Weight (grams)</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    {...field}
                    onChange={(e) => field.onChange(parseFloat(e.target.value) || undefined)}
                    placeholder="174"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {/* Featured Product */}
        <FormField
          control={form.control}
          name="is_featured"
          render={({ field }) => (
            <FormItem className="flex flex-row items-start space-x-3 space-y-0">
              <FormControl>
                <Checkbox
                  checked={field.value}
                  onCheckedChange={field.onChange}
                />
              </FormControl>
              <div className="space-y-1 leading-none">
                <FormLabel>Featured Product</FormLabel>
                <FormDescription>
                  Display this product prominently on the homepage
                </FormDescription>
              </div>
            </FormItem>
          )}
        />

        {/* Images */}
        <div className="space-y-4">
          <FormField
            control={form.control as any}
            name="featured_image"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Featured Image URL</FormLabel>
                <FormControl>
                  <Input {...field} placeholder="https://example.com/product-image.jpg" />
                </FormControl>
                <FormDescription>
                  Main product image displayed in listings
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          <div>
            <Label>Gallery Images</Label>
            <div className="space-y-2 mt-2">
              {galleryImages.map((image, index) => (
                <div key={index} className="flex items-center space-x-2">
                  <Input
                    value={image}
                    onChange={(e) => updateGalleryImage(index, e.target.value)}
                    placeholder="https://example.com/gallery-image.jpg"
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
                Add Image
              </Button>
            </div>
          </div>
        </div>

        {/* Product Attributes */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <Label>Product Specifications</Label>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => appendAttribute({ name: '', value: '', sort_order: 0 } as any)}
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Specification
            </Button>
          </div>
          
          {attributeFields.map((field, index) => (
            <div key={field.id} className="flex items-end space-x-2">
              <FormField
                control={form.control as any}
                name={`attributes.${index}.name`}
                render={({ field }) => (
                  <FormItem className="flex-1">
                    <FormControl>
                      <Input {...field} placeholder="Screen Size" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control as any}
                name={`attributes.${index}.value`}
                render={({ field }) => (
                  <FormItem className="flex-1">
                    <FormControl>
                      <Input {...field} placeholder="6.1 inches" />
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

        <div className="flex justify-end space-x-2">
          <Button type="submit" disabled={loading}>
            {loading ? 'Creating...' : 'Create Product'}
          </Button>
        </div>
      </form>
    </Form>
  );
}