"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Plus } from "lucide-react";
import { useCreateSession } from "@/lib/hooks/use-sessions";

const formSchema = z.object({
  name: z.string().trim().min(1, "Bir isim girin").max(50, "İsim çok uzun"),
});

export function NewSessionDialog({ onCreated }: { onCreated?: (sessionId: string) => void }) {
  const [open, setOpen] = useState(false);
  const createSession = useCreateSession();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: { name: "" },
  });

  function onSubmit(values: z.infer<typeof formSchema>) {
    createSession.mutate(values.name, {
      onSuccess: (session) => {
        reset();
        setOpen(false);
        onCreated?.(session.id);
      },
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button />}>
        <Plus className="size-4" />
        Yeni Oturum
      </DialogTrigger>
      <DialogContent>
        <form onSubmit={handleSubmit(onSubmit)}>
          <DialogHeader>
            <DialogTitle>Yeni WhatsApp oturumu</DialogTitle>
            <DialogDescription>
              Bu oturumu tanımak için bir isim verin (ör. &quot;Satış Hattı&quot;). Oluşturduktan
              sonra bir QR kod görünecek, WhatsApp uygulamanızdan okutarak bağlayın.
            </DialogDescription>
          </DialogHeader>

          <div className="mt-4 flex flex-col gap-2">
            <Label htmlFor="session-name">Oturum adı</Label>
            <Input id="session-name" placeholder="Satış Hattı" autoFocus {...register("name")} />
            {errors.name && <p className="text-sm text-destructive">{errors.name.message}</p>}
          </div>

          <DialogFooter className="mt-4">
            <Button type="submit" disabled={createSession.isPending}>
              {createSession.isPending ? "Oluşturuluyor..." : "Oluştur"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
