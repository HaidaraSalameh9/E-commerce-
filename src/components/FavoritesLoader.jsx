import useFavoritesSync from '../hooks/useFavoritesSync';

export default function FavoritesLoader() {
	useFavoritesSync({ initialize: true });

	return null;
}
