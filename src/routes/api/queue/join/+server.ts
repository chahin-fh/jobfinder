import { json, type RequestEvent } from '@sveltejs/kit';

export async function POST(event: RequestEvent) {
	const supabase = event.locals.supabase;

	const {
		data: { session }
	} = await supabase.auth.getSession();

	if (!session) {
		return json({ error: 'Not authenticated' }, { status: 401 });
	}

	const { role, category_ids } = await event.request.json();

	if (!role || !category_ids || category_ids.length === 0) {
		return json({ error: 'Role and category_ids are required' }, { status: 400 });
	}

	// Create or update profile
	const { error: profileError } = await supabase.from('profiles').upsert(
		{
			id: session.user.id,
			name: session.user.user_metadata.name ?? session.user.email?.split('@')[0] ?? 'User',
			role
		},
		{ onConflict: 'id' }
	);

	if (profileError) {
		return json({ error: profileError.message }, { status: 500 });
	}

	// Check if already in queue
	const { data: existingQueue } = await supabase
		.from('queue_entries')
		.select('id')
		.eq('user_id', session.user.id)
		.eq('status', 'waiting')
		.single();

	if (existingQueue) {
		return json({ error: 'Already in queue' }, { status: 409 });
	}

	// Add to queue
	const { data: queueEntry, error: queueError } = await supabase
		.from('queue_entries')
		.insert({
			user_id: session.user.id,
			role,
			category_ids
		})
		.select()
		.single();

	if (queueError) {
		return json({ error: queueError.message }, { status: 500 });
	}

	// Try to find a match
	const { data: waitingEntries } = await supabase
		.from('queue_entries')
		.select('*')
		.neq('user_id', session.user.id)
		.eq('status', 'waiting')
		.neq('role', role);

	if (waitingEntries && waitingEntries.length > 0) {
		for (const entry of waitingEntries) {
			const overlappingCategories = entry.category_ids.filter((cid: string) =>
				category_ids.includes(cid)
			);

			if (overlappingCategories.length > 0) {
				const matchedCategoryId = overlappingCategories[0];

				const clientId = role === 'client' ? session.user.id : entry.user_id;
				const freelancerId = role === 'freelancer' ? session.user.id : entry.user_id;

				const { data: match, error: matchError } = await supabase
					.from('matches')
					.insert({
						client_id: clientId,
						freelancer_id: freelancerId,
						category_id: matchedCategoryId
					})
					.select()
					.single();

				if (!matchError) {
					await supabase
						.from('queue_entries')
						.update({ status: 'matched', matched_at: new Date().toISOString() })
						.in('id', [queueEntry.id, entry.id]);

					const matchedUserId = entry.user_id;
					const { data: matchedProfile } = await supabase
						.from('profiles')
						.select('name')
						.eq('id', matchedUserId)
						.single();

					const { data: category } = await supabase
						.from('categories')
						.select('*')
						.eq('id', matchedCategoryId)
						.single();

					return json({
						matched: true,
						match: {
							id: match.id,
							matchedUserId,
							matchedName: matchedProfile?.name ?? 'User',
							role: entry.role,
							category,
							chatId: match.id
						}
					});
				}
			}
		}
	}

	return json({ matched: false, queueEntry });
}
