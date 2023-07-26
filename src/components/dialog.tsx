import * as DialogPrimitive from "@radix-ui/react-dialog";
import { AnimatePresence, motion } from "framer-motion";
import { useState } from "react";

export default function Dialog() {
  const [open, setOpen] = useState(false);
  const items = [{ name: "asdf" }, { name: "qwer" }];

  const variants = {
    open: { top: "50%" },
    closed: { top: "-100%" },
  };

  return (
    <DialogPrimitive.Root onOpenChange={(o) => setOpen(o)}>
      <DialogPrimitive.Trigger asChild>
        <button className="text-sm text-white">Edit</button>
      </DialogPrimitive.Trigger>
      <AnimatePresence>
        {open && (
          <DialogPrimitive.Portal forceMount>
            <DialogPrimitive.Overlay className="fixed inset-0 bg-black opacity-30 backdrop-blur-md transition-all" />
            <motion.div
              initial="closed"
              animate="open"
              exit="closed"
              variants={variants}
              transition={{ type: "spring", mass: 0.1, damping: 15 }}
              className="fixed inset-0 z-10 overflow-y-auto"
            >
              <DialogPrimitive.Content className="fixed left-1/2 -translate-x-1/2 -translate-y-1/2 rounded-md bg-white p-6 text-black shadow-md transition-all focus:outline-none">
                <DialogPrimitive.Title className="m-0 text-xl font-bold transition-all">
                  Import Transaction
                </DialogPrimitive.Title>
                <DialogPrimitive.Description className="mb-8 mt-4">
                  Set the target percentage and name. asdfasdfkla sfkl;ja
                  sl;kfjaskldjf al;skjf klasj fklasj dkl;j
                </DialogPrimitive.Description>
                {items.map((i) => (
                  <fieldset
                    className="flex w-24 items-center gap-8 text-right"
                    key={i.name}
                  >
                    <label className="Label">{i.name}</label>
                  </fieldset>
                ))}
                <div className="mt-6 flex justify-end">
                  <DialogPrimitive.Close asChild>
                    <button className=" inline-flex items-center justify-center rounded-md border border-black px-4 py-1 transition-all duration-300 hover:bg-cyan-500">
                      Save
                    </button>
                  </DialogPrimitive.Close>
                </div>
              </DialogPrimitive.Content>
            </motion.div>
          </DialogPrimitive.Portal>
        )}
      </AnimatePresence>
    </DialogPrimitive.Root>
  );
}
