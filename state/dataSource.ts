import AsyncStorage from "@react-native-async-storage/async-storage";

export type DataSource = "dexcom-sandbox" | "nightscout";
const KEY = "glidermon:dataSource";

export async function getDataSource(): Promise<DataSource> {
  const v = await AsyncStorage.getItem(KEY);
  return (v as DataSource) || "dexcom-sandbox";
}
export async function setDataSource(ds: DataSource) {
  await AsyncStorage.setItem(KEY, ds);
}