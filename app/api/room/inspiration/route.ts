import {GET as getBucketFeed} from '../drive-interiors/route';

// Both the full-screen inspiration experience and the thumbnail strip must
// use the same YNOT FEED images; stop mixing unrelated Pexels results.
export async function GET(){return getBucketFeed()}
