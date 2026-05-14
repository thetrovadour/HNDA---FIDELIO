import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { validate } from '../middleware/validate';
import db from '../db';

const CATEGORIES = [
  'Restaurante', 'Supermercado', 'Farmacia', 'Ropa y Calzado',
  'Electrónica', 'Salud y Belleza', 'Educación', 'Transporte',
  'Entretenimiento', 'Servicios', 'Otro',
];

const MerchantApplicationSchema = z.object({
  business_name: z.string().min(1).max(120),
  category: z.string().refine((v) => CATEGORIES.includes(v), { message: 'Categoría inválida' }),
  contact_name: z.string().min(1).max(120),
  contact_email: z.string().email(),
  contact_phone: z.string().min(7).max(20),
  username: z.string().min(3).max(30).refine((v) => /^[a-z0-9_]+$/.test(v), 'Solo letras minúsculas, números y guión bajo'),
  notes: z.string().max(500).optional(),
});

export function applicationsRouter(): Router {
  const router = Router();

  router.post('/merchant', validate(MerchantApplicationSchema), async (req: Request, res: Response) => {
    const body = req.body as z.infer<typeof MerchantApplicationSchema>;

    const existingUsername = await db.user.findFirst({ where: { username: body.username } });
    if (existingUsername) {
      res.status(409).json({ error: 'Este usuario ya está en uso', code: 'USERNAME_TAKEN' });
      return;
    }
    const existingEmail = await db.user.findFirst({ where: { email: body.contact_email } });
    if (existingEmail) {
      res.status(409).json({ error: 'Este correo ya está registrado', code: 'EMAIL_TAKEN' });
      return;
    }

    const application = await db.merchantApplication.create({
      data: {
        business_name: body.business_name,
        category: body.category,
        contact_name: body.contact_name,
        contact_email: body.contact_email,
        contact_phone: body.contact_phone,
        username: body.username,
        notes: body.notes,
      },
    });

    res.status(201).json({ data: { id: application.id } });
  });

  return router;
}
