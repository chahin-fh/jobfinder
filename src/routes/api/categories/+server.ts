import { json, type RequestEvent } from '@sveltejs/kit';

export async function GET(event: RequestEvent) {
	const supabase = event.locals.supabase;

	const { data, error } = await supabase.from('categories').select('*').order('name');

	if (error) {
		return json({ error: error.message }, { status: 500 });
	}

	return json({ categories: data });
}

export async function POST(event: RequestEvent) {
	const supabase = event.locals.supabase;

	const {
		data: { session }
	} = await supabase.auth.getSession();

	if (!session) {
		return json({ error: 'Not authenticated' }, { status: 401 });
	}

	const uid = session.user.id;
	const body = await event.request.json().catch(() => ({}));
	const name = typeof body.name === 'string' ? body.name.trim() : '';
	const icon = typeof body.icon === 'string' ? body.icon.trim() : '';
	const description = typeof body.description === 'string' ? body.description.trim() : '';

	if (!name) {
		return json({ error: 'Category name is required' }, { status: 400 });
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
			created_by: uid
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
