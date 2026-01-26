Background heavy tasks.

Our VPS has 6 core which translates to 12 thread
Meaning we can do 12 tasks at once. However, we do not need to do all 12 tasks at once since our API wont need it.
Instead we will handle trending and popular this season in the background. All time popular and best score doesnt change frequently so we can update it safely in the background every 30 days instead of everytime.
Episodes changes frequently and it needs to be in the background always for non-finished anime (Airing, Upcoming, Hiatus will change and Cancelled, Finished wont change.)
