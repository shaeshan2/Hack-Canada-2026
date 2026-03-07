import { GetServerSideProps } from "next";

export default function AdminIndex() {
  return null;
}

export const getServerSideProps: GetServerSideProps = async () => {
  return { redirect: { destination: "/admin/review", permanent: false } };
};
