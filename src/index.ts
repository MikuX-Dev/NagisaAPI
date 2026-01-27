import Simkl from "./providers/meta/simkl";
import type { FribbAnime } from "./types/provider";

console.log('Hello via Bun!')

const simkl = new Simkl();

const anime: FribbAnime = {
  simkl_id: 1211265,
};

(async () => {
  const res = await simkl.getEpisodes(anime);
  console.log(res);
})();
