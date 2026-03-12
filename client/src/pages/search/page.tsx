import { useEffect } from "react";
import { useLocation } from "wouter";

export default function SearchOrders() {
  const [, setLocation] = useLocation();
  useEffect(() => {
    setLocation("/orders-list");
  }, [setLocation]);
  return null;
}
