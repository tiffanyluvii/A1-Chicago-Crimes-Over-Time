import pandas as pd

df = pd.read_csv('./data/Chicago_Crimes_2001_to_Present.csv')
columns_to_keep = ['Year', 'Primary Type', 'Description', 'Location Description', 'Latitude', 'Longitude']
df = df[columns_to_keep]
df = df.dropna()

df["Year"] = df["Year"].astype(int)

sample_per_year = 2000
sampled = (
    df.groupby("Year", group_keys=True)
      .apply(lambda x: x.sample(n=min(sample_per_year, len(x)), random_state=67))
)

print(sampled.columns.tolist())

sampled = sampled.reset_index(level=0)   # brings Year out as a normal column
sampled = sampled.reset_index(drop=True)

print(sampled.head(10))
print("cols:", sampled.columns.tolist())
print("index names:", sampled.index.names)

sampled.to_csv("sample_by_year.csv", index=False)


