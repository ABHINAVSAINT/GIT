import { getDatabase } from '../database';
import type { Category } from '@finance/engine';

export async function getAllCategories(): Promise<Category[]> {
  const db = getDatabase();
  const rows = db.getAll<any>(
    'SELECT * FROM categories ORDER BY sort_order'
  );
  return rows.map(mapRow);
}

export async function getCategoriesByType(type: string): Promise<Category[]> {
  const db = getDatabase();
  const rows = db.getAll<any>(
    'SELECT * FROM categories WHERE type = ? ORDER BY sort_order',
    [type]
  );
  return rows.map(mapRow);
}

export async function insertCategory(cat: Category): Promise<void> {
  const db = getDatabase();
  db.execute(
    `INSERT INTO categories (id, name, parent_id, type, icon, color, is_system, sort_order, budget_amount, budget_period)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      cat.id, cat.name, cat.parentId ?? null, cat.type,
      cat.icon, cat.color, cat.isSystem ? 1 : 0, cat.sortOrder,
      cat.budgetAmount ?? null, cat.budgetPeriod ?? null,
    ]
  );
}

function mapRow(row: any): Category {
  return {
    id: row.id,
    name: row.name,
    parentId: row.parent_id ?? undefined,
    type: row.type,
    icon: row.icon,
    color: row.color,
    isSystem: row.is_system === 1,
    sortOrder: row.sort_order,
    budgetAmount: row.budget_amount ?? undefined,
    budgetPeriod: row.budget_period ?? undefined,
    createdAt: row.created_at,
  };
}
