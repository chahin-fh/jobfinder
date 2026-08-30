import { json, type RequestEvent } from '@sveltejs/kit';

export async function POST(event: RequestEvent) {
	const supabase = event.locals.supabase;

	const {
		data: { session }
	} = await supabase.auth.getSession();

	if (!session) {
		return json({ error: 'Not authenticated' }, { status: 401 });
	}

	// Get the current user's waiting queue entry
	const { data: myEntry, error: myEntryError } = await supabase
		.from('queue_entries')
		.select('*')
		.eq('user_id', session.user.id)
		.eq('status', 'waiting')
		.single();

	if (myEntryError || !myEntry) {
		return json({ matched: false, reason: 'Not in queue' });
	}

	// Find waiting entries with the opposite role
	const { data: waitingEntries } = await supabase
		.from('queue_entries')
		.select('*')
		.neq('user_id', session.user.id)
		.eq('status', 'waiting')
		.neq('role', myEntry.role);

	if (!waitingEntries || waitingEntries.length === 0) {
		return json({ matched: false });
	}

	// Try to find an overlapping category
	for (const entry of waitingEntries) {
		const overlappingCategories = entry.category_ids.filter((cid: string) =>
			myEntry.category_ids.includes(cid)
		);

		if (overlappingCategories.length > 0) {
			const matchedCategoryId = overlappingCategories[0];

			const clientId = myEntry.role === 'client' ? session.user.id : entry.user_id;
			const freelancerId = myEntry.role === 'freelancer' ? session.user.id : entry.user_id;

			// Check if a match already exists between these two users for this category
			const { data: existingMatch } = await supabase
				.from('matches')
				.select('id')
				.eq('client_id', clientId)
				.eq('freelancer_id', freelancerId)
				.eq('category_id', matchedCategoryId)
				.maybeSingle();

			if (existingMatch) {
				// Match already exists, just update status for both users
				await supabase
					.from('queue_entries')
					.update({ status: 'matched', matched_at: new Date().toISOString() })
					.in('id', [myEntry.id, entry.id]);

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
						id: existingMatch.id,
						matchedUserId,
						matchedName: matchedProfile?.name ?? 'User',
						role: entry.role,
						category,
						chatId: existingMatch.id
					}
				});
			}

			// Create a new match
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
				// Update both queue entries to matched
				await supabase
					.from('queue_entries')
					.update({ status: 'matched', matched_at: new Date().toISOString() })
					.in('id', [myEntry.id, entry.id]);

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

	return json({ matched: false });
}
