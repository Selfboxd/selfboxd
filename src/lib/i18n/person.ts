import type { PersonRole } from '../catalog/person';
import { m } from '../paraglide/messages.js';

const roleNames: Record<PersonRole, () => string> = {
	actor: m.person_role_actor,
	director: m.person_role_director,
	'co-director': m.person_role_co_director,
	creator: m.person_role_creator,
	producer: m.person_role_producer,
	'executive-producer': m.person_role_executive_producer,
	writer: m.person_role_writer,
	'original-writer': m.person_role_original_writer,
	story: m.person_role_story,
	casting: m.person_role_casting,
	editor: m.person_role_editor,
	cinematography: m.person_role_cinematography,
	'production-design': m.person_role_production_design,
	'art-direction': m.person_role_art_direction,
	'set-decoration': m.person_role_set_decoration,
	'visual-effects': m.person_role_visual_effects,
	composer: m.person_role_composer,
	sound: m.person_role_sound,
	'costume-design': m.person_role_costume_design,
	makeup: m.person_role_makeup,
	stunts: m.person_role_stunts
};

/** Name of a role on a person page in the language of the interface. */
export function roleName(role: PersonRole): string {
	return roleNames[role]();
}

/** Line above the name of a person, telling the role of the works shown. */
export function roleHeading(role: PersonRole): string {
	switch (role) {
		case 'actor':
			return m.person_heading_actor();
		case 'director':
			return m.person_heading_director();
		default:
			return m.person_heading_role({ role: roleName(role) });
	}
}
