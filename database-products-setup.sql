-- Product Data Management Database Setup
-- Run this SQL in your Supabase SQL Editor to set up product tables

-- Create products table
CREATE TABLE IF NOT EXISTS products (
  id SERIAL PRIMARY KEY,
  external_id INTEGER UNIQUE NOT NULL, -- DummyJSON ID
  title TEXT NOT NULL,
  description TEXT,
  price DECIMAL(10,2) NOT NULL,
  discount_percentage DECIMAL(5,2) DEFAULT 0,
  rating DECIMAL(3,2) DEFAULT 0,
  stock INTEGER DEFAULT 0,
  brand TEXT,
  category TEXT NOT NULL,
  thumbnail TEXT,
  images TEXT[] DEFAULT '{}',
  tags TEXT[] DEFAULT '{}',
  dimensions JSONB,
  warranty_information TEXT,
  shipping_information TEXT,
  availability_status TEXT,
  reviews JSONB DEFAULT '[]',
  return_policy TEXT,
  minimum_order_quantity INTEGER DEFAULT 1,
  meta_data JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  last_sync_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create categories table for better data integrity
CREATE TABLE IF NOT EXISTS product_categories (
  id SERIAL PRIMARY KEY,
  slug TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  parent_category_id INTEGER REFERENCES product_categories(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create data sync log table to track synchronization
CREATE TABLE IF NOT EXISTS data_sync_log (
  id SERIAL PRIMARY KEY,
  sync_type TEXT NOT NULL, -- 'full', 'incremental', 'categories'
  source TEXT NOT NULL DEFAULT 'dummyjson',
  status TEXT NOT NULL, -- 'started', 'completed', 'failed'
  records_processed INTEGER DEFAULT 0,
  records_succeeded INTEGER DEFAULT 0,
  records_failed INTEGER DEFAULT 0,
  error_details JSONB,
  started_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  sync_config JSONB
);

-- Create indexes for products table
CREATE INDEX IF NOT EXISTS products_external_id_idx ON products(external_id);
CREATE INDEX IF NOT EXISTS products_category_idx ON products(category);
CREATE INDEX IF NOT EXISTS products_brand_idx ON products(brand);
CREATE INDEX IF NOT EXISTS products_price_idx ON products(price);
CREATE INDEX IF NOT EXISTS products_rating_idx ON products(rating);
CREATE INDEX IF NOT EXISTS products_stock_idx ON products(stock);
CREATE INDEX IF NOT EXISTS products_availability_idx ON products(availability_status);
CREATE INDEX IF NOT EXISTS products_tags_idx ON products USING GIN(tags);
CREATE INDEX IF NOT EXISTS products_last_sync_idx ON products(last_sync_at);

-- Create indexes for categories table
CREATE INDEX IF NOT EXISTS categories_slug_idx ON product_categories(slug);
CREATE INDEX IF NOT EXISTS categories_parent_idx ON product_categories(parent_category_id);

-- Create indexes for sync log table
CREATE INDEX IF NOT EXISTS sync_log_status_idx ON data_sync_log(status);
CREATE INDEX IF NOT EXISTS sync_log_started_idx ON data_sync_log(started_at);
CREATE INDEX IF NOT EXISTS sync_log_type_idx ON data_sync_log(sync_type);

-- Add updated_at trigger for products
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_products_updated_at 
    BEFORE UPDATE ON products 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_categories_updated_at 
    BEFORE UPDATE ON product_categories 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Create materialized view for product search optimization
CREATE MATERIALIZED VIEW IF NOT EXISTS product_search_view AS
SELECT 
  p.id,
  p.external_id,
  p.title,
  p.description,
  p.price,
  p.discount_percentage,
  p.rating,
  p.stock,
  p.brand,
  p.category,
  p.thumbnail,
  p.availability_status,
  pc.name as category_name,
  setweight(to_tsvector('english', p.title), 'A') ||
  setweight(to_tsvector('english', COALESCE(p.description, '')), 'B') ||
  setweight(to_tsvector('english', COALESCE(p.brand, '')), 'C') ||
  setweight(to_tsvector('english', array_to_string(p.tags, ' ')), 'D') as search_vector
FROM products p
LEFT JOIN product_categories pc ON pc.slug = p.category
WHERE p.stock > 0 AND p.availability_status != 'Out of Stock';

-- Create index on search vector
CREATE INDEX IF NOT EXISTS product_search_vector_idx ON product_search_view USING GIN(search_vector);

-- Refresh materialized view function
CREATE OR REPLACE FUNCTION refresh_product_search_view()
RETURNS TRIGGER AS $$
BEGIN
    REFRESH MATERIALIZED VIEW CONCURRENTLY product_search_view;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to refresh search view on product changes
CREATE TRIGGER refresh_search_view_trigger
    AFTER INSERT OR UPDATE OR DELETE ON products
    FOR EACH STATEMENT
    EXECUTE FUNCTION refresh_product_search_view();

-- Enable Row Level Security (RLS)
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE data_sync_log ENABLE ROW LEVEL SECURITY;

-- Create policies for public read access (adjust as needed for your security requirements)
CREATE POLICY "Allow public read access to products" ON products
    FOR SELECT USING (true);

CREATE POLICY "Allow public read access to categories" ON product_categories
    FOR SELECT USING (true);

-- Create policy for service role to manage data
CREATE POLICY "Allow service role to manage products" ON products
    FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Allow service role to manage categories" ON product_categories
    FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Allow service role to manage sync log" ON data_sync_log
    FOR ALL USING (auth.role() = 'service_role');

-- Create function to get product statistics
CREATE OR REPLACE FUNCTION get_product_stats()
RETURNS TABLE(
    total_products BIGINT,
    total_categories BIGINT,
    avg_price DECIMAL,
    avg_rating DECIMAL,
    total_stock BIGINT,
    last_sync TIMESTAMPTZ
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COUNT(*)::BIGINT as total_products,
        COUNT(DISTINCT category)::BIGINT as total_categories,
        ROUND(AVG(price), 2) as avg_price,
        ROUND(AVG(rating), 2) as avg_rating,
        SUM(stock)::BIGINT as total_stock,
        MAX(last_sync_at) as last_sync
    FROM products;
END;
$$ LANGUAGE plpgsql;
