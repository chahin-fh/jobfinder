import { json, type RequestEvent } from '@sveltejs/kit';
import { requireUser, unauthorized } from '$lib/server/auth';

export async function GET(event: RequestEvent) {
	const supabase = event.locals.supabase;

	// RLS already limits anonymous callers to approved rows.
	const { data, error } = await supabase
		.from('categories')
		.select('id, name, icon, description, status, created_at')
		.eq('status', 'approved')
		.order('name');

	if (error) {
		return json({ error: error.message }, { status: 500 });
	}

	return json({ categories: data ?? [] });
}

export async function POST(event: RequestEvent) {
	const auth = await requireUser(event);
	if (!auth) return unauthorized();
	const { supabase, user } = auth;

	const body = await event.request.json().catch(() => ({}));
	const name = typeof body.name === 'string' ? body.name.trim() : '';
	const icon = typeof body.icon === 'string' ? body.icon.trim() : '';
	const description = typeof body.description === 'string' ? body.description.trim() : '';

	if (!name) {
		return json({ error: 'Category name is required' }, { status: 400 });
	}

	if (name.length > 60) {
		return json({ error: 'Category name is too long' }, { status: 400 });
	}

	// `created_by` references profiles(id). Profile rows are created by a trigger
	// on signup, but this keeps the route working on databases that predate it.
	const { data: existingProfile } = await supabase
		.from('profiles')
		.select('id')
		.eq('id', user.id)
		.maybeSingle();

	if (!existingProfile) {
		const { error: profileError } = await supabase.from('profiles').upsert(
			{
				id: user.id,
				name: user.user_metadata?.name ?? user.email?.split('@')[0] ?? 'User',
				role: body.role === 'client' ? 'client' : 'freelancer'
			},
			{ onConflict: 'id' }
		);

		if (profileError) {
			return json({ error: profileError.message }, { status: 500 });
		}
	}

	// Reject duplicates (case-insensitive). Escape ILIKE wildcards in user input.
	const escapedName = name.replace(/[%_\\]/g, '\\$&');
	const { data: existing } = await supabase
		.from('categories')
		.select('id')
		.ilike('name', escapedName)
		.maybeSingle();

	if (existing) {
		return json({ error: 'A category with this name already exists' }, { status: 409 });
	}

	// New categories are submitted as pending requests for the admin to review.
	const { data: category, error } = await supabase
		.from('categories')
		.insert({
			name,
			icon: icon || '📁',
			description: description || `Work related to ${name}`,
			status: 'pending',
			created_by: user.id
		})
		.select()
		.single();

	if (error) {
		// Unique constraint on lower(name) - reject exact duplicates across all statuses.
		if (error.code === '23505') {
			return json({ error: 'A category with this name already exists' }, { status: 409 });
		}
		return json({ error: error.message }, { status: 500 });
	}

	return json({ category }, { status: 201 });
}
